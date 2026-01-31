"""
生成可在 Jupyter 中做题并提交的考核 Notebook 模板。
运行时从 API 拉取题目、填写答案后提交，成绩与 Web 端打通。
"""
import json
from typing import Optional


def build_exam_notebook_json(chapter_id: int, api_base_url: str) -> dict:
    """生成考核用 Jupyter Notebook 的 JSON（nbformat v4）。"""
    api_base_url = (api_base_url or "").rstrip("/")
    if not api_base_url:
        api_base_url = "https://your-platform.com/api/v1"

    cells = [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 章节考核（Jupyter 版）\n",
                "\n",
                "本 Notebook 可从平台拉取题目、填写答案并提交，**成绩会同步到学习进度**。\n",
                "\n",
                "**使用步骤：**\n",
                "1. 在平台个人中心或登录后获取 **Access Token**。\n",
                "2. 在下方代码单元格中设置 `API_BASE_URL`（平台 API 地址）和 `AUTH_TOKEN`（或通过环境变量 `LLM_EXAM_TOKEN` 设置）。\n",
                "3. 依次运行各单元格：拉取题目 → 填写 `answers` → 提交并查看结果。\n",
            ],
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": [
                "# 配置：平台 API 地址与本章节 ID\n",
                f'API_BASE_URL = "{api_base_url}"\n',
                f"CHAPTER_ID = {chapter_id}\n",
                "\n",
                "# Token：可从平台个人中心复制，或设置环境变量 LLM_EXAM_TOKEN\n",
                "import os\n",
                'AUTH_TOKEN = os.environ.get("LLM_EXAM_TOKEN") or input("请粘贴 Access Token: ").strip()\n',
                'if not AUTH_TOKEN:\n',
                '    raise ValueError("请设置 AUTH_TOKEN 或环境变量 LLM_EXAM_TOKEN")\n',
            ],
            "outputs": [],
            "execution_count": None,
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": [
                "# 拉取题目（不含答案）\n",
                "import requests\n",
                "\n",
                "r = requests.get(\n",
                "    f\"{API_BASE_URL}/exam/{CHAPTER_ID}/questions\",\n",
                "    headers={\"Authorization\": f\"Bearer {AUTH_TOKEN}\"},\n",
                ")\n",
                "r.raise_for_status()\n",
                "questions = r.json()\n",
                "print(f\"共 {len(questions)} 题\")\n",
                "for q in questions:\n",
                "    opts = q.get(\"options\") or []\n",
                "    opt_str = \" | \".join([f\"{o['key']}:{o['value']}\" for o in opts]) if opts else \"(填空/简答)\"\n",
                "    print(f\"  [{q['id']}] {q['content'][:60]}... 选项: {opt_str}\")\n",
            ],
            "outputs": [],
            "execution_count": None,
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 填写答案\n",
                "根据上方的题目列表，在下方 `answers` 中按 **题目 id** 填写答案。\n",
                "- 单选题/判断题：答案为选项 key，如 `\"A\"`, `\"true\"`\n",
                "- 填空题：多空用 `|` 或逗号分隔\n",
                "- 简答题：填写要点或完整句子\n",
            ],
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": [
                "# 按题目 id 填写答案（运行前请修改）\n",
                "answers = {\n",
                "    # 例: 1: \"A\",  2: \"B\",  3: \"true\",  4: \"关键词1|关键词2\"\n",
                "}\n",
                "\n",
                "# 若上面拉取的题目 id 为 101, 102, ... 可这样填：\n",
                "# for q in questions:\n",
                "#     answers[q[\"id\"]] = \"\"  # 在此填写该题答案\n",
                "print(\"当前 answers:\", answers)\n",
            ],
            "outputs": [],
            "execution_count": None,
        },
        {
            "cell_type": "code",
            "metadata": {},
            "source": [
                "# 提交答案并查看结果（成绩会同步到平台）\n",
                "r = requests.post(\n",
                "    f\"{API_BASE_URL}/exam/{CHAPTER_ID}/submit\",\n",
                "    headers={\n",
                "        \"Authorization\": f\"Bearer {AUTH_TOKEN}\",\n",
                "        \"Content-Type\": \"application/json\",\n",
                "    },\n",
                "    json={\"answers\": {int(k): v for k, v in answers.items()}},\n",
                ")\n",
                "r.raise_for_status()\n",
                "result = r.json()\n",
                "print(f\"得分: {result['score']} / {result['total_score']} ({result['percentage']}%)\")\n",
                "print(f\"正确: {result['correct_count']} / {result['total_count']}\")\n",
                "print(f\"是否最高分: {result['is_best']}\")\n",
                "print(\"成绩已同步到学习进度。\")\n",
                "for d in result.get(\"details\", []):\n",
                "    print(f\"  题{d['question_id']}: {\"正确\" if d['is_correct'] else \"错误\"} (你的: {d['user_answer']}, 正确: {d['correct_answer']})\")\n",
            ],
            "outputs": [],
            "execution_count": None,
        },
    ]

    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {
                "display_name": "Python 3",
                "language": "python",
                "name": "python3",
            },
            "language_info": {
                "name": "python",
                "version": "3.9.0",
            },
        },
        "cells": cells,
    }


def get_exam_notebook_bytes(chapter_id: int, api_base_url: Optional[str] = None) -> bytes:
    """返回考核 Notebook 的 JSON 字节，用于下载。"""
    nb = build_exam_notebook_json(chapter_id, api_base_url or "")
    return json.dumps(nb, ensure_ascii=False, indent=1).encode("utf-8")
