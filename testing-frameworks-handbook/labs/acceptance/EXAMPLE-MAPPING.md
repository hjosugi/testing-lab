# Example mapping: CHK-42 Coupons at checkout

Story: 顧客はcouponで商品代金を下げられる。ただし店は送料や商品を無償にして損をしない。

status: **engineering draft**。product（PO）・QA・engineerの3役によるexample mapping session（目安25分）で確認し、[`review.json`](review.json)へ3役のsign-offを記録するまでは「合意済み」ではありません。黄色=story、青=rule、緑=example、赤=question。

| Rule | Examples | 提案（要PO確認） |
|---|---|---|
| R1 percentage couponは商品小計だけを下げ、送料は下げない | 3000円+送料500円→3200円、12345円→11111円（端数切り捨て） | 端数は顧客有利に切り捨て |
| R2 最低商品小計がある | 2999円は拒否、3000円は適用 | 境界は「以上」 |
| R3 同じ顧客は1回だけ | 2回目は拒否 | 家族共有は対象外（下記question） |
| R4 期限切れは拒否、期限日当日は有効 | 10/31適用、11/1拒否 | 日付は店舗timezone（JST）で判定 |
| R5 fixed couponで商品小計がマイナスにならない | 1200円に5000円off→送料700円だけ支払う | 差額はpointへ繰り越さない |

## Questions（未決）

| ID | Question | Owner | 期限 |
|---|---|---|---|
| Q1 | 同一世帯の別accountは「同じ顧客」か | PO | 次回refinement |
| Q2 | 返品時にcoupon利用回数を戻すか | PO + CS | 次回refinement |

Questionが残っているruleは、解決するまでscenarioを追加しません（推測でexampleを作らない）。
