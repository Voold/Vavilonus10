import datetime
import schedule
from data import db_session
from data.tasks import Task

db_session.global_init("db_vavilonus.db")


def chec_task():
    session = db_session.create_session()
    tasks = session.query(Task).all()
    worker_id = []
    for task in tasks:
        deadline = task.deadline
        if deadline == datetime.date.today():
            worker_id.append(task.id_worker)
    return worker_id

schedule.every(5).seconds.do(chec_task)
while True:
    schedule.run_pending()
