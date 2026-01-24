"""
学习进度相关的 Pydantic 模型
"""
from pydantic import BaseModel
from datetime import datetime, date
from typing import Optional, List


class ProgressBase(BaseModel):
    """进度基础模型"""
    chapter_id: int
    completion_percentage: float = 0.0
    completed: bool = False


class ProgressUpdate(BaseModel):
    """更新进度模型"""
    completion_percentage: Optional[float] = None
    completed: Optional[bool] = None
    study_time_seconds: Optional[int] = None  # 学习时长（秒）
    exam_score: Optional[float] = None  # 考核最高分
    exam_attempts: Optional[int] = None  # 考核次数


class ProgressResponse(BaseModel):
    """进度响应模型"""
    id: int
    chapter_id: int
    completion_percentage: float
    completed: bool
    last_accessed: datetime
    study_time_seconds: int = 0
    exam_score: float = 0.0
    exam_attempts: int = 0

    class Config:
        from_attributes = True


class ChapterProgressDetail(BaseModel):
    """章节进度详情"""
    chapter_id: int
    chapter_number: int
    title: str
    completion_percentage: float
    completed: bool
    study_time_seconds: int
    exam_score: float = 0.0
    exam_attempts: int = 0
    last_accessed: Optional[datetime] = None


class StudyStatistics(BaseModel):
    """学习统计数据"""
    total_chapters: int  # 总章节数
    completed_chapters: int  # 已完成章节数
    in_progress_chapters: int  # 学习中章节数
    overall_progress: float  # 整体进度百分比
    total_study_time_seconds: int  # 总学习时长（秒）
    current_streak: int  # 当前连续学习天数
    longest_streak: int  # 最长连续学习天数
    last_study_date: Optional[date] = None  # 上次学习日期
    chapter_details: List[ChapterProgressDetail] = []  # 各章节进度详情


class DailyStudyRecord(BaseModel):
    """每日学习记录"""
    study_date: date
    study_time_seconds: int
    chapters_studied: int

    class Config:
        from_attributes = True


class StudyHeatmapData(BaseModel):
    """学习热力图数据"""
    records: List[DailyStudyRecord]
    start_date: date
    end_date: date
