# notebooklm: ハンドブックを観点別knowledge baseとして運用する
<!-- labels: documentation,learning,ai -->

## Tasks

- [ ] `./scripts/build-notebooklm.sh` でバンドルを再生成し、diffをreviewする
- [ ] NotebookLMに6バンドルを取り込み、ノートブックを作成する
- [ ] 日本語のAudio Overviewを観点1〜3で生成し、内容の誤りを1件以上探す
- [ ] 観点横断の質問を10個投げ、回答と引用元チャンクの対応を確認する
- [ ] docs更新時にバンドル再生成を忘れないよう、手順をREADMEかCIに記録する

## Acceptance criteria

- [ ] 6バンドルすべてが最新のdocs/issuesから再生成されている
- [ ] NotebookLMの回答がソース引用付きで7観点の質問に答えられる
- [ ] ハルシネーションを見つけた場合、元docの記述改善としてfeedbackされている
