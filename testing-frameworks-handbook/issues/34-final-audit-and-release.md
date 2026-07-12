# release: 教材・code・Nix・論文・Issueの最終auditを完了する
<!-- labels: release,documentation,quality,priority-high -->

## Depends on

- #01
- #05
- #06
- #07
- #08
- #09
- #10
- #11
- #12
- #13

## Tasks

- [ ] `STRICT=1 ./scripts/test-all.sh`
- [ ] link/version/date audit
- [ ] all source code format/lint/test
- [ ] issue dry-run count/title/label audit
- [ ] licenses、third-party notices、secret scan
- [ ] ZIP manifest/checksum/reproducibility note
- [ ] READMEのcommandをclean environmentで実行

## Acceptance criteria

- [ ] `VALIDATION.md`にpass/skip/failを正直に記録
- [ ] known limitationにowner/follow-up Issueがある

