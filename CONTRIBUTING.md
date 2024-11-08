# 🤝 Руководство по участию в разработке

Спасибо за интерес к нашему проекту! Мы рады любой помощи в развитии движка.

## 📋 Содержание

- [Как начать](#как-начать)
- [Процесс разработки](#процесс-разработки)
- [Стиль кода](#стиль-кода)
- [Отправка изменений](#отправка-изменений)
- [Сообщения о проблемах](#сообщения-о-проблемах)

## 🚀 Как начать

1. Форкните репозиторий
2. Клонируйте ваш форк:
```bash
git clone https://github.com/ivanoskov/shooter.git
cd web-fps-engine
```
3. Установите зависимости:
```bash
yarn install
```
4. Создайте новую ветку для ваших изменений:
```bash
git checkout -b feature/ваша-фича
```

## 💻 Процесс разработки

1. Убедитесь, что ваш код соответствует нашим стандартам
2. Напишите тесты для новой функциональности
3. Запустите все тесты:
```bash
yarn test
```
4. Убедитесь, что сборка проходит успешно:
```bash
yarn build
```

## 📝 Стиль кода

### TypeScript

- Используйте строгую типизацию
- Избегайте использования `any`
- Документируйте публичные методы и классы
- Используйте интерфейсы для определения контрактов

```typescript
// ✅ Правильно
interface Vector3 {
  x: number;
  y: number;
  z: number;
}

class Player {
  private position: Vector3;
  
  /**
   * Перемещает игрока в указанную позицию
   * @param position - Новая позиция
   */
  public moveTo(position: Vector3): void {
    this.position = position;
  }
}

// ❌ Неправильно
class Player {
  position: any;
  
  moveTo(pos) {
    this.position = pos;
  }
}
```

### Именование

- Используйте `PascalCase` для классов и интерфейсов
- Используйте `camelCase` для методов и переменных
- Используйте `UPPER_CASE` для констант

### Форматирование

- Отступ: 2 пробела
- Максимальная длина строки: 100 символов
- Используйте точку с запятой в конце выражений
- Используйте одинарные кавычки для строк

## 📤 Отправка изменений

1. Убедитесь, что все тесты проходят
2. Обновите документацию при необходимости
3. Сделайте коммит изменений:
```bash
git add .
git commit -m "feat: краткое описание изменений"
```
4. Отправьте изменения в ваш форк:
```bash
git push origin feature/ваша-фича
```
5. Создайте Pull Request

### Соглашения о коммитах

Используйте следующие префиксы для коммитов:

- `feat:` - новая функциональность
- `fix:` - исправление ошибок
- `docs:` - изменения в документации
- `style:` - форматирование, отступы и т.д.
- `refactor:` - рефакторинг кода
- `perf:` - оптимизации производительности
- `test:` - добавление или изенение тестов
- `chore:` - обновление зависимостей, конфигурации и т.д.

## 🐛 Сообщения о проблемах

При создании Issue, пожалуйста, используйте следующие шаблоны:

### Для багов:
```markdown
**Описание бага**
Четкое описание проблемы

**Шаги воспроизведения**
1. Шаг 1
2. Шаг 2
3. ...

**Ожидаемое поведение**
Описание ожидаемого поведения

**Фактическое поведение**
Описание фактического поведения

**Окружение**
- Браузер и версия
- ОС
- Версия движка
```

### Для предложений:
```markdown
**Описание предложения**
Четкое описание предлагаемой функциональности

**Обоснование**
Почему это улучшит проект

**Возможная реализация**
Идеи по реализации (если есть)
```

## 🔍 Code Review

- Каждый PR должен быть проверен как минимум одним разработчиком
- Используйте конструктивные комментарии
- Обращайте внимание на:
  - Производительность
  - Типизацию
  - Тестируемость
  - Документацию
  - Соответствие стилю кода

## 📚 Дополнительные ресурсы

- [Документация Three.js](https://threejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Best_practices)

## ❓ Вопросы

Если у вас есть вопросы, не стесняйтесь создавать Issue или обращаться к maintainers проекта.

## 📄 Лицензия

Внося свой вклад в проект, вы соглашаетесь с тем, что ваши изменения будут распространяться под той же лицензией, что и основной проект (MIT). 