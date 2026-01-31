"""
考试服务层
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from app.models import Question, ExamRecord, Chapter, Progress
from app.schemas.exam import (
    QuestionResponse,
    QuestionWithAnswer,
    QuestionOption,
    ExamSubmission,
    ExamResult,
    ExamRecordResponse,
    ExamRecordDetail,
    AnswerDetail,
    ChapterExamStatus,
)
from app.core.exceptions import ChapterNotFoundError


class ExamService:
    """考试服务"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_questions(self, chapter_id: int) -> List[QuestionResponse]:
        """获取章节试题列表（不含答案）"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        questions = self.db.query(Question).filter(
            Question.chapter_id == chapter_id
        ).order_by(Question.order_index).all()
        
        return [
            QuestionResponse(
                id=q.id,
                chapter_id=q.chapter_id,
                question_type=q.question_type,
                content=q.content,
                options=[QuestionOption(**opt) for opt in (q.options or [])] if q.options else None,
                score=q.score,
                order_index=q.order_index,
            )
            for q in questions
        ]
    
    def submit_exam(
        self, chapter_id: int, submission: ExamSubmission, user_id: str
    ) -> ExamResult:
        """提交答案并评分"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        # 获取所有试题（含答案）
        questions = self.db.query(Question).filter(
            Question.chapter_id == chapter_id
        ).order_by(Question.order_index).all()
        
        if not questions:
            return ExamResult(
                score=0,
                total_score=0,
                correct_count=0,
                total_count=0,
                percentage=0,
                is_best=True,
                details=[],
            )
        
        # 评分
        total_score = 0
        earned_score = 0
        correct_count = 0
        details = []
        
        for q in questions:
            total_score += q.score
            user_answer = submission.answers.get(q.id, "")
            
            # 处理答案格式
            if isinstance(user_answer, list):
                user_answer = ",".join(sorted(user_answer))
            
            # 判断正确性
            correct_answer = q.answer
            is_correct = self._check_answer(user_answer, correct_answer, q.question_type)
            
            if is_correct:
                earned_score += q.score
                correct_count += 1
            
            details.append(AnswerDetail(
                question_id=q.id,
                question_content=q.content,
                question_type=q.question_type,
                options=[QuestionOption(**opt) for opt in (q.options or [])] if q.options else None,
                user_answer=user_answer,
                correct_answer=correct_answer,
                is_correct=is_correct,
                score=q.score,
                earned_score=q.score if is_correct else 0,
                explanation=q.explanation,
            ))
        
        # 计算百分比
        percentage = (earned_score / total_score * 100) if total_score > 0 else 0
        
        # 获取历史最高分
        best_record = self.db.query(ExamRecord).filter(
            ExamRecord.chapter_id == chapter_id,
            ExamRecord.user_id == user_id,
        ).order_by(ExamRecord.score.desc()).first()
        
        is_best = best_record is None or earned_score > best_record.score
        
        # 保存考试记录
        exam_record = ExamRecord(
            user_id=user_id,
            chapter_id=chapter_id,
            score=earned_score,
            total_score=total_score,
            correct_count=correct_count,
            total_count=len(questions),
            answers={str(k): v for k, v in submission.answers.items()},
        )
        self.db.add(exam_record)
        
        # 更新进度表中的考核成绩（如果是最高分）
        if is_best:
            self._update_progress_exam_score(chapter_id, user_id, percentage)
        
        # 更新考核次数
        self._increment_exam_attempts(chapter_id, user_id)
        
        self.db.commit()
        
        return ExamResult(
            score=earned_score,
            total_score=total_score,
            correct_count=correct_count,
            total_count=len(questions),
            percentage=round(percentage, 1),
            is_best=is_best,
            details=details,
        )
    
    def _check_answer(self, user_answer: str, correct_answer: str, question_type: str) -> bool:
        """检查答案是否正确"""
        if not user_answer:
            return False

        user_answer = user_answer.strip()
        correct_answer = correct_answer.strip()
        if not correct_answer:
            return False

        if question_type == "multi_choice":
            user_set = set(u.strip().lower() for u in user_answer.split(","))
            correct_set = set(c.strip().lower() for c in correct_answer.split(","))
            return user_set == correct_set
        if question_type == "fill_blank":
            # 多空用 | 或逗号分隔，逐空比较（忽略大小写与首尾空格）
            sep = "|" if "|" in correct_answer else ","
            user_parts = [u.strip().lower() for u in user_answer.replace("|", ",").split(",")]
            correct_parts = [c.strip().lower() for c in correct_answer.split(sep)]
            if len(user_parts) != len(correct_parts):
                return False
            return all(u == c for u, c in zip(user_parts, correct_parts))
        if question_type == "short_answer":
            # 简答：参考答案为关键词（逗号分隔），用户答案包含任一关键词即算对，或完全匹配
            user_lower = user_answer.lower()
            keywords = [k.strip().lower() for k in correct_answer.split(",") if k.strip()]
            if not keywords:
                return user_lower == correct_answer.lower()
            return any(kw in user_lower for kw in keywords) or user_lower == correct_answer.lower()
        # single_choice / true_false
        return user_answer.strip().lower() == correct_answer.strip().lower()
    
    def _update_progress_exam_score(
        self, chapter_id: int, user_id: str, percentage: float
    ) -> None:
        """更新进度表中的考核成绩"""
        progress = self.db.query(Progress).filter(
            Progress.chapter_id == chapter_id,
            Progress.user_id == user_id,
        ).first()
        
        if not progress:
            progress = Progress(
                chapter_id=chapter_id,
                user_id=user_id,
                completion_percentage=0.0,
                completed=0,
                study_time_seconds=0,
                exam_score=0.0,
                exam_attempts=0,
            )
            self.db.add(progress)
        
        progress.exam_score = percentage
        progress.last_accessed = datetime.utcnow()
    
    def _increment_exam_attempts(self, chapter_id: int, user_id: str) -> None:
        """增加考核次数"""
        progress = self.db.query(Progress).filter(
            Progress.chapter_id == chapter_id,
            Progress.user_id == user_id,
        ).first()
        
        if progress:
            progress.exam_attempts = (progress.exam_attempts or 0) + 1
    
    def get_exam_records(
        self, chapter_id: int, user_id: str
    ) -> List[ExamRecordResponse]:
        """获取用户的考试历史记录"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        records = self.db.query(ExamRecord).filter(
            ExamRecord.chapter_id == chapter_id,
            ExamRecord.user_id == user_id,
        ).order_by(ExamRecord.created_at.desc()).all()
        
        return [
            ExamRecordResponse(
                id=r.id,
                chapter_id=r.chapter_id,
                score=r.score,
                total_score=r.total_score,
                correct_count=r.correct_count,
                total_count=r.total_count,
                percentage=round((r.score / r.total_score * 100) if r.total_score > 0 else 0, 1),
                created_at=r.created_at,
            )
            for r in records
        ]
    
    def get_best_record(
        self, chapter_id: int, user_id: str
    ) -> Optional[ExamRecordResponse]:
        """获取最高分记录"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        record = self.db.query(ExamRecord).filter(
            ExamRecord.chapter_id == chapter_id,
            ExamRecord.user_id == user_id,
        ).order_by(ExamRecord.score.desc()).first()
        
        if not record:
            return None
        
        return ExamRecordResponse(
            id=record.id,
            chapter_id=record.chapter_id,
            score=record.score,
            total_score=record.total_score,
            correct_count=record.correct_count,
            total_count=record.total_count,
            percentage=round((record.score / record.total_score * 100) if record.total_score > 0 else 0, 1),
            created_at=record.created_at,
        )
    
    def get_chapter_exam_status(
        self, chapter_id: int, user_id: str
    ) -> ChapterExamStatus:
        """获取章节考试状态"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
        # 获取试题统计
        questions = self.db.query(Question).filter(
            Question.chapter_id == chapter_id
        ).all()
        
        question_count = len(questions)
        total_score = sum(q.score for q in questions)
        
        # 获取用户考试统计
        progress = self.db.query(Progress).filter(
            Progress.chapter_id == chapter_id,
            Progress.user_id == user_id,
        ).first()
        
        best_score = progress.exam_score if progress else 0.0
        attempts = progress.exam_attempts if progress else 0
        
        # 获取最近考试时间
        last_record = self.db.query(ExamRecord).filter(
            ExamRecord.chapter_id == chapter_id,
            ExamRecord.user_id == user_id,
        ).order_by(ExamRecord.created_at.desc()).first()
        
        return ChapterExamStatus(
            chapter_id=chapter_id,
            has_questions=question_count > 0,
            question_count=question_count,
            total_score=total_score,
            best_score=best_score,
            best_percentage=best_score,  # 已经是百分比形式
            attempts=attempts,
            last_exam_time=last_record.created_at if last_record else None,
        )
