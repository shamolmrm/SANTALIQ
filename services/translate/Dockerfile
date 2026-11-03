# syntax=docker/dockerfile:1
# SANTALIQ translation service — NLLB-200 distilled 600M, served with CTranslate2 (int8, CPU).
# Model license: CC-BY-NC-4.0 (non-commercial use only).

# ── Stage 1: download the Hugging Face model and convert it to CTranslate2 int8 ──
FROM python:3.12-slim AS convert
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch==2.5.1 \
 && pip install "transformers==4.46.3" "ctranslate2==4.6.0" "sentencepiece==0.2.0" "huggingface_hub==0.26.5"
ARG MODEL=facebook/nllb-200-distilled-600M
RUN ct2-transformers-converter --model "$MODEL" --output_dir /model --quantization int8 \
 && python -c "from huggingface_hub import hf_hub_download as d; import shutil; shutil.copy(d('$MODEL','sentencepiece.bpe.model'), '/model/sentencepiece.bpe.model')"

# ── Stage 2: slim runtime ──
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1 \
    MODEL_DIR=/model
WORKDIR /app
RUN pip install --upgrade "pip>=26.2"
COPY requirements.txt ./
RUN pip install -r requirements.txt && useradd --system --uid 1001 santaliq
COPY --from=convert /model /model
COPY app.py ./
USER santaliq
EXPOSE 8100
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8100/health')" || exit 1
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "1"]
