# Orenza — frontend

CRM для строительных компаний, подрядчиков и частных мастеров. Интерфейс на украинском.

Сейчас в проекте только **регистрация и авторизация** — шаблон без обращений к API,
но с валидацией и формой payload'а по контракту бекенда (`orenza-backend`).

## Запуск

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
npm run test:unit  # vitest
npm run lint       # oxlint + eslint
```

## Что сделано

| Маршрут       | Экран                                                                   |
| ------------- | ----------------------------------------------------------------------- |
| `/login`      | Вход: почта, пароль, «не выходить на этом устройстве»                   |
| `/register`   | Регистрация в 3 шага: профиль → контакты → пароль                       |
| `/workspaces` | Выбор рабочего простора: карточки + создание нового (сразу после входа) |
| `/workspace`  | Экран внутри выбранного простора: реквизиты и следующие шаги             |

Дизайн: тёмная левая панель с данными стройки (карточки объектов,
счётчики, лента событий, подсветка за курсором) и светлая форма справа.
Акцент — `#38B000`, шрифты Unbounded + Inter.

## Связь с бекендом

Клиентская валидация повторяет `RegisterRequest` / `LoginRequest`:

- `first_name`, `last_name`, `email`, `phone` (опционально), `password` + `password_confirmation`, `device_name`;
- телефон нормализуется как в `UserData::normalisePhone` и приводится к `+380…`;
- минимальная длина пароля — 8 (`Password::min(8)`), индикатор надёжности подсказывает
  требования продакшн-политики: 10+ символов, буквы, цифры, спецсимвол.

Список простров — сетка карточек плюс кнопка создания (в шапке и плиткой в сетке);
создание открывается модалкой (тип простора + название). Карточка показывает ровно поля `WorkspaceResource`: `name`, `type`, `slug`,
`created_at` и признак владельца (`owner_id` против `id` пользователя). Форма создания
повторяет `StoreWorkspaceRequest` и `CreateWorkspaceAction`: `type` обязателен, `name`
обязателен только для компании (для личного бекенд подставит `full_name` владельца),
адрес (`slug`) форма не спрашивает — его генерирует `GenerateWorkspaceSlugAction` из названия;
личный простор — один на аккаунт.

Заглушки для подключения API помечены `TODO` в `src/stores/auth.ts`
(`POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`)
и в `src/stores/workspaces.ts` (`POST /api/v1/workspaces`; списка `GET /api/v1/workspaces`
на бекенде пока нет, поэтому список хранится локально).

Пока API не подключён, store отвечает локально: пароль короче 8 символов даёт
ошибку входа, а почта `taken@orenza.ua` — ответ «email уже занят».

## Структура

```
src/
  assets/       токены дизайна и базовые стили
  components/
    auth/       AuthShowcase (левая панель), StepRail (шаги)
    workspaces/ WorkspaceCard, WorkspaceCreateDialog
    ui/         TextField, PasswordField, PasswordMeter, CheckBox, BrandMark
  composables/  useCountUp, usePointerGlow
  layouts/      AuthLayout
  lib/          validation.ts, workspaces.ts + тесты
  stores/       auth.ts, workspaces.ts (pinia, пока без сети)
  views/        LoginView, RegisterView, WorkspacesView, WorkspaceView
```
