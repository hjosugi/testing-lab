# test(api): OpenAPI schema/property/stateful testを追加する
<!-- labels: api-testing,openapi,property-testing -->

## Tasks

- [x] OpenAPI 3.1をimplementationと同期
- [x] Schemathesisでpositive/negative generation
- [x] stateful POST→GET→DELETE chainを追加
- [x] deterministic seedとfailure corpusを保存
- [x] Dredd/Prism/Hurl/Pactum/Karateの役割差を比較

## Acceptance criteria

- [x] undocumented 5xx、schema mismatch、unexpected fieldを検出
