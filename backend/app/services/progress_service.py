"""
学习进度服务层
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.models import Progress, Chapter, StudyRecord
from app.schemas.progress import (
    ProgressResponse, 
    ProgressUpdate, 
    StudyStatistics, 
    ChapterProgressDetail,
    DailyStudyRecord,
    StudyHeatmapData,
)
from app.core.exceptions import ChapterNotFoundError


class ProgressService:
    """学习进度服务（需传入 user_id，对应登录用户）"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_chapter_id(self, chapter_id: int, user_id: str) -> ProgressResponse:
        """获取指定章节的学习进度"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
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
            )
            self.db.add(progress)
            self.db.commit()
            self.db.refresh(progress)
        
        return ProgressResponse(
            id=progress.id,
            chapter_id=progress.chapter_id,
            completion_percentage=progress.completion_percentage,
            completed=bool(progress.completed),
            last_accessed=progress.last_accessed,
            study_time_seconds=progress.study_time_seconds or 0,
            exam_score=progress.exam_score or 0.0,
            exam_attempts=progress.exam_attempts or 0,
        )
    
    def update(
        self, chapter_id: int, progress_update: ProgressUpdate, user_id: str
    ) -> ProgressResponse:
        """更新学习进度"""
        chapter = self.db.query(Chapter).filter(Chapter.id == chapter_id).first()
        if not chapter:
            raise ChapterNotFoundError(chapter_id)
        
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
            )
            self.db.add(progress)
        
        if progress_update.completion_percentage is not None:
            progress.completion_percentage = progress_update.completion_percentage
        if progress_update.completed is not None:
            progress.completed = 1 if progress_update.completed else 0
        if progress_update.study_time_seconds is not None:
            # 累加学习时长
            progress.study_time_seconds = (progress.study_time_seconds or 0) + progress_update.study_time_seconds
            # 同时更新每日学习记录
            self._update_daily_record(user_id, progress_update.study_time_seconds)
        if progress_update.exam_score is not None:
            progress.exam_score = progress_update.exam_score
        if progress_update.exam_attempts is not None:
            progress.exam_attempts = progress_update.exam_attempts
        
        # 重新计算综合完成度
        progress.completion_percentage = self._calculate_completion(
            progress.study_time_seconds or 0,
            progress.exam_score or 0.0
        )
        
        # 如果综合完成度达到100%，标记为已完成
        if progress.completion_percentage >= 100:
            progress.completed = 1
        
        progress.last_accessed = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(progress)
        
        return ProgressResponse(
            id=progress.id,
            chapter_id=progress.chapter_id,
            completion_percentage=progress.completion_percentage,
            completed=bool(progress.completed),
            last_accessed=progress.last_accessed,
            study_time_seconds=progress.study_time_seconds or 0,
            exam_score=progress.exam_score or 0.0,
            exam_attempts=progress.exam_attempts or 0,
        )
    
    def _calculate_completion(
        self, study_time_seconds: int, exam_score: float, chapter_target_time: int = 3600
    ) -> float:
        """
        计算综合完成度
        - 学习时长权重: 50%（达到目标时长为满分）
        - 考核成绩权重: 50%
        
        Args:
            study_time_seconds: 学习时长（秒）
            exam_score: 考核成绩（0-100）
            chapter_target_time: 每章目标学习时长（默认1小时=3600秒）
        
        Returns:
            综合完成度（0-100）
        """
        time_progress = min(100, (study_time_seconds / chapter_target_time) * 100)
        return round((time_progress * 0.5) + (exam_score * 0.5), 1)
    
    def _update_daily_record(self, user_id: str, added_seconds: int) -> None:
        """更新每日学习记录"""
        today = date.today()
        record = self.db.query(StudyRecord).filter(
            StudyRecord.user_id == user_id,
            StudyRecord.study_date == today,
        ).first()
        
        if not record:
            record = StudyRecord(
                user_id=user_id,
                study_date=today,
                study_time_seconds=0,
                chapters_studied=1,
            )
            self.db.add(record)
        
        record.study_time_seconds += added_seconds
        record.updated_at = datetime.utcnow()
    
    def get_all(self, user_id: str) -> List[ProgressResponse]:
        """获取当前用户所有章节的学习进度"""
        progress_list = self.db.query(Progress).filter(
            Progress.user_id == user_id,
        ).all()
        return [
            ProgressResponse(
                id=p.id,
                chapter_id=p.chapter_id,
                completion_percentage=p.completion_percentage,
                completed=bool(p.completed),
                last_accessed=p.last_accessed,
                study_time_seconds=p.study_time_seconds or 0,
                exam_score=p.exam_score or 0.0,
                exam_attempts=p.exam_attempts or 0,
            )
            for p in progress_list
        ]
    
    def get_statistics(self, user_id: str) -> StudyStatistics:
        """获取用户学习统计数据"""
        # 获取所有章节
        chapters = self.db.query(Chapter).order_by(Chapter.chapter_number).all()
        total_chapters = len(chapters)
        
        # 获取用户所有进度记录
        progress_map = {}
        progress_list = self.db.query(Progress).filter(
            Progress.user_id == user_id,
        ).all()
        for p in progress_list:
            progress_map[p.chapter_id] = p
        
        # 计算统计数据
        completed_chapters = 0
        in_progress_chapters = 0
        total_percentage = 0.0
        total_study_time = 0
        chapter_details = []
        
        for chapter in chapters:
            progress = progress_map.get(chapter.id)
            if progress:
                if progress.completed:
                    completed_chapters += 1
                elif progress.completion_percentage > 0:
                    in_progress_chapters += 1
                total_percentage += progress.completion_percentage
                total_study_time += progress.study_time_seconds or 0
                
                chapter_details.append(ChapterProgressDetail(
                    chapter_id=chapter.id,
                    chapter_number=chapter.chapter_number,
                    title=chapter.title,
                    completion_percentage=progress.completion_percentage,
                    completed=bool(progress.completed),
                    study_time_seconds=progress.study_time_seconds or 0,
                    exam_score=progress.exam_score or 0.0,
                    exam_attempts=progress.exam_attempts or 0,
                    last_accessed=progress.last_accessed,
                ))
            else:
                chapter_details.append(ChapterProgressDetail(
                    chapter_id=chapter.id,
                    chapter_number=chapter.chapter_number,
                    title=chapter.title,
                    completion_percentage=0.0,
                    completed=False,
                    study_time_seconds=0,
                    exam_score=0.0,
                    exam_attempts=0,
                    last_accessed=None,
                ))
        
        # 计算整体进度
        overall_progress = total_percentage / total_chapters if total_chapters > 0 else 0.0
        
        # 计算连续学习天数
        current_streak, longest_streak, last_study_date = self._calculate_streak(user_id)
        
        return StudyStatistics(
            total_chapters=total_chapters,
            completed_chapters=completed_chapters,
            in_progress_chapters=in_progress_chapters,
            overall_progress=round(overall_progress, 1),
            total_study_time_seconds=total_study_time,
            current_streak=current_streak,
            longest_streak=longest_streak,
            last_study_date=last_study_date,
            chapter_details=chapter_details,
        )
    
    def _calculate_streak(self, user_id: str) -> tuple[int, int, Optional[date]]:
        """计算连续学习天数"""
        records = self.db.query(StudyRecord).filter(
            StudyRecord.user_id == user_id,
            StudyRecord.study_time_seconds > 0,
        ).order_by(StudyRecord.study_date.desc()).all()
        
        if not records:
            return 0, 0, None
        
        last_study_date = records[0].study_date
        today = date.today()
        
        # 计算当前连续天数
        current_streak = 0
        expected_date = today
        
        # 如果今天还没学习，从昨天开始算
        if last_study_date != today:
            expected_date = today - timedelta(days=1)
            if last_study_date != expected_date:
                # 昨天也没学习，当前连续为0
                current_streak = 0
            else:
                current_streak = 1
                expected_date -= timedelta(days=1)
        else:
            current_streak = 1
            expected_date = today - timedelta(days=1)
        
        # 继续向前计算连续天数
        study_dates = set(r.study_date for r in records)
        while expected_date in study_dates:
            current_streak += 1
            expected_date -= timedelta(days=1)
        
        # 计算最长连续天数
        longest_streak = current_streak
        if records:
            sorted_dates = sorted([r.study_date for r in records])
            temp_streak = 1
            for i in range(1, len(sorted_dates)):
                if sorted_dates[i] - sorted_dates[i-1] == timedelta(days=1):
                    temp_streak += 1
                else:
                    longest_streak = max(longest_streak, temp_streak)
                    temp_streak = 1
            longest_streak = max(longest_streak, temp_streak)
        
        return current_streak, longest_streak, last_study_date
    
    def get_study_heatmap(self, user_id: str, days: int = 365) -> StudyHeatmapData:
        """获取学习热力图数据"""
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        records = self.db.query(StudyRecord).filter(
            StudyRecord.user_id == user_id,
            StudyRecord.study_date >= start_date,
            StudyRecord.study_date <= end_date,
        ).order_by(StudyRecord.study_date).all()
        
        daily_records = [
            DailyStudyRecord(
                study_date=r.study_date,
                study_time_seconds=r.study_time_seconds,
                chapters_studied=r.chapters_studied,
            )
            for r in records
        ]
        
        return StudyHeatmapData(
            records=daily_records,
            start_date=start_date,
            end_date=end_date,
        )
