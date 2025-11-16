from .db_session import SqlAlchemyBase
from sqlalchemy import Column, Integer, Text, ForeignKey, String, DateTime
from sqlalchemy.orm import declarative_base, relationship
import datetime


class Task(SqlAlchemyBase):
    __tablename__ = "Task"

    id = Column(Integer, primary_key=True, autoincrement=True)
    id_worker = Column(Integer, ForeignKey("User.id"), nullable=False)
    inn_worker = Column(Integer)
    task_name = Column(Text)
    deadline = Column(DateTime, default=datetime.date.today() + datetime.timedelta(days=1))
    task_body = Column(Text)
    complete = Column(Integer, default=0)
