"""
考试相关的 Pydantic 模型
"""
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Dict, Any, Union


class QuestionOption(BaseModel):
    """题目选项"""
    key: str
    value: str


class QuestionBase(BaseModel):
    """试题基础模型"""
    question_type: str  # single_choice, multi_choice, true_false
    content: str
    options: Optional[List[QuestionOption]] = None
    score: int = 10


class QuestionCreate(QuestionBase):
    """创建试题模型"""
    chapter_id: int
    answer: str
    explanation: Optional[str] = None
    order_index: int = 0


class QuestionResponse(QuestionBase):
    """试题响应模型（不包含答案，用于考试时）"""
    id: int
    chapter_id: int
    order_index: int

    class Config:
        from_attributes = True


class QuestionWithAnswer(QuestionResponse):
    """试题完整模型（包含答案，用于查看结果时）"""
    answer: str
    explanation: Optional[str] = None


class ExamSubmission(BaseModel):
    """考试提交模型"""
    answers: Dict[int, Union[str, List[str]]]  # {question_id: answer}


class AnswerDetail(BaseModel):
    """答题详情"""
    question_id: int
    question_content: str
    question_type: str
    options: Optional[List[QuestionOption]] = None
    user_answer: str
    correct_answer: str
    is_correct: bool
    score: int
    earned_score: int
    explanation: Optional[str] = None


class ExamResult(BaseModel):
    """考试结果模型"""
    score: float
    total_score: float
    correct_count: int
    total_count: int
    percentage: float  # 百分比得分
    is_best: bool  # 是否为最高分
    details: List[AnswerDetail]


class ExamRecordResponse(BaseModel):
    """考试记录响应模型"""
    id: int
    chapter_id: int
    score: float
    total_score: float
    correct_count: int
    total_count: int
    percentage: float
    created_at: datetime

    class Config:
        from_attributes = True


class ExamRecordDetail(ExamRecordResponse):
    """考试记录详情（包含答题详情）"""
    answers: Optional[Dict[str, Any]] = None
    details: Optional[List[AnswerDetail]] = None


class ChapterExamInfo(BaseModel):
    """章节考核信息（免鉴权，仅是否有题与题数）"""
    chapter_id: int
    has_questions: bool
    question_count: int


class ChapterExamStatus(BaseModel):
    """章节考试状态"""
    chapter_id: int
    has_questions: bool  # 是否有试题
    question_count: int  # 试题数量
    total_score: int  # 总分
    best_score: float  # 最高分
    best_percentage: float  # 最高分百分比
    attempts: int  # 考试次数
    last_exam_time: Optional[datetime] = None  # 最近考试时间
