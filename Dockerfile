FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .

RUN apt-get update && apt-get install -y libgomp1 libpq-dev gcc python3-dev
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p models/bin
