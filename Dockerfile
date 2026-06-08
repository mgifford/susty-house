FROM python:3.12-slim

RUN useradd -m -u 1000 user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /app

COPY --chown=user:user requirements.txt requirements.txt
RUN pip install --no-cache-dir --upgrade -r requirements.txt

COPY --chown=user:user . /app

USER user

EXPOSE 7860

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]