# Генерация карт: источники и лицензии

## Azgaar / Fantasy Map Generator

Источник: https://github.com/Azgaar/Fantasy-Map-Generator

Изученная ревизия: `5165b330c504df2b21f367fd728a51c3f2e23cc5`.
Автор: Max Haniyeu (Azgaar). Лицензия MIT; полный текст сохранён в
[vendor/azgaar.LICENSE](vendor/azgaar.LICENSE).

Адаптации для клеточного игрового мира:

- `regional-terrain.js`: таблица классификации биомов из `src/generators/biomes-generator.ts`; водосборная схема из `river-generator.ts` — разрешение впадин, накопление осадков, нижележащие ячейки, слияния и ширина по расходу. Высоты создаются отдельной игровой моделью холмов и долин; впадины разрешаются priority-flood.
- `azgaar-climate.js`: перенос влаги ветром, выпадение осадков при подъёме, пополнение влаги над водой из `precipitation-generator.ts`; интерфейс заменён явными аргументами.
- `regional-roads.js`: граф Уркхарта по триангуляции и стоимость пути с учётом высот, обитаемости и существующих дорог из `routes-generator.ts`. Игровые дополнения: мосты, обход строений, уточнение пути на клеточной сетке в узких проходах.

Редакторы, политическая карта, культуры, государства, системы названий и UI исходного приложения не включены в игровой пакет.

## Watabou / TownGeneratorOS

Источник: https://github.com/watabou/TownGeneratorOS

Изученная ревизия: `7fbc87a9398cc508af24de93f79cf2ad027f352b`.
Исходный проект опубликован по GPL-3.0.

`town-plan.js` — самостоятельная реализация геометрического подхода для нашей
клеточной карты: диаграмма Вороного, релаксация Ллойда, объединённый внешний контур
кварталов, граф улиц и рекурсивное деление участков поперёк длинного ребра.
Ориентиры для изучения: `building/Model.hx`, `building/Topology.hx`,
`wards/Ward.hx`, `wards/CommonWard.hx`. Исходный Haxe-код, его перевод и
ассеты TownGeneratorOS в этот репозиторий не включены.

## d3-delaunay

Версия 6.0.4: https://github.com/d3/d3-delaunay/tree/v6.0.4

В `vendor/d3-delaunay.js` находится автономная сборка, обёрнутая в ES-модуль;
она обеспечивает триангуляцию Делоне и диаграмму Вороного без сетевого доступа
и установки пакетов при запуске игры.

Сохранены уведомления и лицензии:

- [d3-delaunay.LICENSE](vendor/d3-delaunay.LICENSE)
- [delaunator.LICENSE](vendor/delaunator.LICENSE)
- [robust-predicates.LICENSE](vendor/robust-predicates.LICENSE)
