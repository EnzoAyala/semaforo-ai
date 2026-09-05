FROM python:3.11-slim
WORKDIR /app
ENV PYTHONPYCACHEPREFIX=/app/.cache/python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "src/app.py"]