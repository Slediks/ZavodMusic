# ZavodMusic Frontend

Frontend-часть проекта на React + TypeScript + Vite.

## Требования

### Локальный запуск (без Docker)
- Node.js 20+
- npm 10+

### Запуск в Docker
- Docker Engine 24+
- Docker Compose v2+

## Переменные и сеть

Приложение собирается в статические файлы и в production отдается через `nginx`.

Важно:
- frontend делает запросы на `/api/...` относительно текущего домена;
- backend должен быть доступен с того же хоста/домена через reverse proxy или общую точку входа.

## Запуск в режиме Dev (локально)

1. Установить зависимости:

```bash
npm ci
```

2. Запустить dev-сервер:

```bash
npm run dev
```

3. Открыть в браузере:
- [http://localhost:5173](http://localhost:5173)

## Запуск в режиме Prod (локально, без Docker)

1. Установить зависимости:

```bash
npm ci
```

2. Собрать production bundle:

```bash
npm run build
```

3. Проверить production сборку локально:

```bash
npm run preview
```

4. Открыть в браузере:
- [http://localhost:4173](http://localhost:4173)

## Docker: готовые файлы

В каталоге `frontend` подготовлены:
- `Dockerfile` (multi-stage: `dev`, `build`, `prod`)
- `nginx.conf` (SPA fallback на `index.html`)
- `docker-compose.yml` (dev и prod сценарии)
- `docker-compose.offline.yml` (запуск в полностью изолированной среде из заранее загруженного image)

## Docker: запуск Dev

Из каталога `frontend`:

```bash
docker compose up --build frontend-dev
```

Открыть:
- [http://localhost:5173](http://localhost:5173)

Остановка:

```bash
docker compose down
```

## Docker: запуск Prod

Из каталога `frontend`:

```bash
docker compose --profile prod up --build frontend-prod
```

Открыть:
- [http://localhost:8080](http://localhost:8080)

Остановка:

```bash
docker compose --profile prod down
```

## Развертывание в полностью обособленной от интернета среде

Ниже процесс, при котором в изолированной среде не требуется интернет.

### 1) Подготовка артефактов в среде с интернетом

Из каталога `frontend` собрать production image:

```bash
docker build --target prod -t zavodmusic-frontend:local .
```

Сохранить image в tar:

```bash
docker save -o zavodmusic-frontend-local.tar zavodmusic-frontend:local
```

Подготовить файлы для переноса в изолированную среду:
- `docker-compose.offline.yml`
- `zavodmusic-frontend-local.tar`

### 2) Перенос в изолированную среду

Скопировать файлы любым разрешенным способом (USB, закрытый артефакт-репозиторий, внутреннее хранилище).

### 3) Запуск в изолированной среде

Загрузить image из tar:

```bash
docker load -i zavodmusic-frontend-local.tar
```

Запустить контейнер через offline compose:

```bash
docker compose -f docker-compose.offline.yml up -d
```

Проверить доступность:
- [http://localhost:8080](http://localhost:8080)

Остановка:

```bash
docker compose -f docker-compose.offline.yml down
```

## Обновление в изолированной среде

При изменениях frontend повторяется цикл:
1. В онлайн-среде пересобрать image.
2. Снова сделать `docker save`.
3. Перенести новый tar.
4. В офлайн-среде выполнить `docker load` и перезапустить compose.

## Полезные команды

Проверка сборки в контейнере:

```bash
docker build --target prod -t zavodmusic-frontend:test .
```

Просмотр логов:

```bash
docker compose logs -f
```

## Структура Dockerfile

- `deps`: установка npm зависимостей
- `dev`: запуск Vite dev server
- `build`: сборка `dist`
- `prod`: минимальный runtime на `nginx`
