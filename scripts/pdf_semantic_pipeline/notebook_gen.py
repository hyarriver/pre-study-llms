"""
从 Markdown 提取章节，LLM 生成题目，输出可自动评分 Jupyter Notebook。
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Optional

MAX_MATERIAL_CHARS = 12000


def extract_chapters_from_markdown(md_text: str) -> list[dict]:
    """
    从 Markdown 按 # / ## 提取章节。
    返回 [{"level": 1|2|3, "title": str, "content": str}, ...]
    """
    chapters = []
    lines = md_text.split("\n")
    current_chapter: dict | None = None
    current_content: list[str] = []

    def flush():
        nonlocal current_chapter, current_content
        if current_chapter is not None:
            content = "\n".join(current_content).strip()
            if len(content) > MAX_MATERIAL_CHARS:
                content = content[:MAX_MATERIAL_CHARS] + "\n\n[内容已截断]"
            current_chapter["content"] = content
            chapters.append(current_chapter)
        current_chapter = None
        current_content = []

    for line in lines:
        m = re.match(r"^(#{1,3})\s+(.+)$", line)
        if m:
            flush()
            level = len(m.group(1))
            title = m.group(2).strip()
            current_chapter = {"level": level, "title": title, "content": ""}
            current_content = []
        else:
            if current_chapter is not None:
                current_content.append(line)

    flush()
    return chapters


def call_llm_generate_questions(
    chapter_num: int,
    title: str,
    material: str,
    count: int = 4,
) -> list[dict]:
    """调用 LLM 生成题目"""
    try:
        from openai import OpenAI
    except ImportError:
        return []

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return []

    client = OpenAI(api_key=api_key)
    base_url = os.environ.get("OPENAI_BASE_URL")
    if base_url:
        client = OpenAI(api_key=api_key, base_url=base_url)

    system = """你是一个出题助手。根据用户提供的「章节材料」文本，生成章节考核题。
要求：
1. 只输出一个 JSON 数组，不要其他说明。
2. 每题格式：
   - type: "single_choice" 或 "true_false"
   - content: 题干（字符串）
   - options: 选项列表。单选题为 [{"key":"A","value":"选项A"}, ...] 至少4项；判断题为 [{"key":"true","value":"正确"},{"key":"false","value":"错误"}]
   - answer: 正确答案的 key，如 "B" 或 "true"
   - explanation: 简短解析（字符串）
3. 至少生成 """ + str(max(2, count - 2)) + """ 道单选题、2 道判断题；题目需基于材料内容，不要编造。
4. 输出必须是合法 JSON，且仅为数组。"""

    user = f"章节 {chapter_num}：{title}\n\n材料：\n{material[:MAX_MATERIAL_CHARS]}"

    try:
        resp = client.chat.completions.create(
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.3,
        )
        raw = (resp.choices[0].message.content or "").strip()
    except Exception:
        return []

    raw = raw.replace("```json", "").replace("```", "").strip()
    m = re.search(r"\[[\s\S]*\]", raw)
    if not m:
        return []
    try:
        questions = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []

    result = []
    for q in questions[:count] if isinstance(questions, list) else []:
        if not isinstance(q, dict):
            continue
        t = (q.get("type") or "single_choice").strip().lower()
        if t not in ("single_choice", "true_false"):
            t = "single_choice"
        content = (q.get("content") or "").strip()
        if not content:
            continue
        options = q.get("options")
        if not options or not isinstance(options, list):
            if t == "true_false":
                options = [{"key": "true", "value": "正确"}, {"key": "false", "value": "错误"}]
            else:
                continue
        answer = (q.get("answer") or "").strip()
        explanation = (q.get("explanation") or "").strip()
        result.append({
            "type": t,
            "content": content,
            "options": options,
            "answer": answer,
            "explanation": explanation,
        })
    return result


def build_exam_notebook(
    chapters_with_questions: list[dict],
    output_path: Path,
) -> None:
    """
    构建可自动评分的 ipynb。
    chapters_with_questions: [{"title": str, "content": str, "questions": [...]}, ...]
    """
    cells = []
    all_questions: list[dict] = []
    qid = 1

    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [
            "# 章节考核（自动评分版）\n",
            "\n",
            "请阅读各章节内容后完成题目，在下方 `answers` 字典中填写答案，运行评分单元格即可查看结果。\n",
        ],
    })

    for ch in chapters_with_questions:
        title = ch.get("title", "")
        content = (ch.get("content", ""))[:2000] + ("..." if len(ch.get("content", "")) > 2000 else "")
        questions = ch.get("questions", [])

        cells.append({
            "cell_type": "markdown",
            "metadata": {},
            "source": [f"## {title}\n", "\n", content + "\n"],
        })

        if questions:
            cells.append({
                "cell_type": "markdown",
                "metadata": {},
                "source": ["### 题目\n"],
            })
            for q in questions:
                opts = q.get("options", [])
                opt_str = "  \n".join([f"- {o.get('key')}: {o.get('value')}" for o in opts])
                cells.append({
                    "cell_type": "markdown",
                    "metadata": {},
                    "source": [f"**{qid}.** {q.get('content', '')}\n", "\n", opt_str + "\n"],
                })
                all_questions.append({**q, "id": qid})
                qid += 1

    # 答案填写 cell
    answers_entries = [f"    {q['id']}: \"\",  # {str(q.get('content', ''))[:40]}..." for q in all_questions[:15]]
    if len(all_questions) > 15:
        answers_entries.append("    # ... 更多题目请按 id 添加")
    answers_src = "answers = {\n" + "\n".join(answers_entries) + "\n}\n"
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": ["## 填写答案\n", "在下方字典中按题目 id 填写答案（单选题填 A/B/C/D，判断题填 true/false）：\n"],
    })
    cells.append({
        "cell_type": "code",
        "metadata": {},
        "source": [line + "\n" for line in answers_src.rstrip().split("\n")] if answers_src else ["answers = {}\n"],
        "outputs": [],
        "execution_count": None,
    })

    # 自动评分 cell（答案存于 metadata，本地评分）
    correct_answers = {str(q["id"]): q["answer"] for q in all_questions}
    explanations = {str(q["id"]): q.get("explanation", "") for q in all_questions}
    cells.append({
        "cell_type": "code",
        "metadata": {},
        "source": [
            "# 自动评分（答案已嵌入，仅本地运行）\n",
            "correct_answers = " + repr(correct_answers) + "\n",
            "explanations = " + repr(explanations) + "\n",
            "\n",
            "score = 0\n",
            "total = len(correct_answers)\n",
            "for qid, ans in correct_answers.items():\n",
            "    if str(answers.get(int(qid), \"\")).strip().lower() == str(ans).strip().lower():\n",
            "        score += 1\n",
            "    else:\n",
            "        print(f\"题 {qid} 错误。解析: {explanations.get(qid, '')}\")\n",
            "print(f\"得分: {score}/{total} ({100*score//max(1,total)}%)\")\n",
        ],
        "outputs": [],
        "execution_count": None,
    })

    nb = {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.9.0"},
        },
        "cells": cells,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(nb, f, ensure_ascii=False, indent=1)
