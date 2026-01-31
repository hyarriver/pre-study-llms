#!/usr/bin/env python3
"""
将 documents/exam_questions_generated.json 中校对后的题目合并进 documents/exam_questions.json。
默认策略：对 generated 中存在的章节，用其题目**替换** exam_questions.json 中该章的全部题目；
其余章节保留不动。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCUMENTS = ROOT / "documents"
GENERATED_FILE = DOCUMENTS / "exam_questions_generated.json"
MAIN_FILE = DOCUMENTS / "exam_questions.json"


def main():
    parser = argparse.ArgumentParser(description="将生成题合并进 exam_questions.json")
    parser.add_argument("--generated", type=str, default=str(GENERATED_FILE), help="生成结果 JSON 路径")
    parser.add_argument("--main", type=str, default=str(MAIN_FILE), help="主题目文件路径")
    parser.add_argument("--dry-run", action="store_true", help="只打印将要合并的章节，不写文件")
    args = parser.parse_args()

    generated_path = Path(args.generated)
    main_path = Path(args.main)

    if not generated_path.exists():
        print(f"未找到生成文件: {generated_path}", file=sys.stderr)
        sys.exit(1)

    with open(generated_path, "r", encoding="utf-8") as f:
        generated = json.load(f)

    if not isinstance(generated, dict):
        print("generated 文件格式应为 { chapter1: [...], chapter2: [...] }", file=sys.stderr)
        sys.exit(1)

    main_data: dict = {}
    if main_path.exists():
        with open(main_path, "r", encoding="utf-8") as f:
            main_data = json.load(f)
        if not isinstance(main_data, dict):
            main_data = {}
    else:
        print(f"主文件不存在，将创建: {main_path}")

    merged = dict(main_data)
    for key, questions in generated.items():
        if not key.startswith("chapter") or not isinstance(questions, list):
            continue
        merged[key] = questions
        if args.dry_run:
            print(f"将合并 {key}: {len(questions)} 题")

    if args.dry_run:
        print("dry-run 结束，未写入文件。")
        return

    with open(main_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)
    print(f"已合并到 {main_path}。请重启后端或重新初始化试题以使新题目生效。")


if __name__ == "__main__":
    main()
