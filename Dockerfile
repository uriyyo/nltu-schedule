FROM python:3.11.3-slim

WORKDIR /code

COPY ./requirements.txt /code/requirements.txt
COPY ./app.py /code/app.py
COPY ./start.sh /code/start.sh

RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

CMD ["/code/start.sh"]