---
kind: upgrade-guide
description: "The web GUI ships Vietnamese as a ninth locale and opens in it when the browser requests no shipped language."
---

# Vietnamese becomes the fallback UI language

English | [中文](guide.zh.md)

## Change

The web GUI now ships a Vietnamese (`vi`) locale alongside English, Chinese, Japanese, Spanish, French, German, Russian, and Brazilian Portuguese. Plugin metadata and the Desktop shell and installer ship Vietnamese resources too. A browser that requests none of those languages previously opened in English; it now opens in Vietnamese, and the Language selector lists Vietnamese first as the default choice. English remains the terminal dictionary fallback for keys a shipped dictionary misses, so lookups are unchanged. Users of every language, and authors of language packs, can observe the new locale. Any client plugin that registers the `vi` language id or `vi` dictionaries for `common` or `settings.locale` now fails with an already-registered error.

## Migration

1. To keep an English interface on browsers whose language list matches no shipped locale, select English in Settings → General, or add `locale.preference: en` under the `locale` settings namespace in `$DSH_HOME/cordis.patch.yml`. A stored preference still wins over browser detection, so existing selections need no change.
2. Remove the `ctx.locale.addLanguage({ id: 'vi', … })` call and any `vi` dictionary from a third-party language pack; shipped dictionaries already occupy those seats.
3. Reload with a browser that requests an unshipped language and confirm the interface opens in Vietnamese, then switch to English and confirm the choice persists across a reload.
