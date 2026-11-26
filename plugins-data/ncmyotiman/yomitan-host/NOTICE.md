# Yomitan companion experiment

Host and adapter source in this directory: MIT, same license as the parent repository.

The optional local build loads **Yomitan 26.10.12.0**, unchanged, from
https://github.com/yomidevs/yomitan/releases/tag/26.10.12.0 .
Yomitan and its notices are GPL-3.0-or-later; it is not relicensed as MIT.
Corresponding source: https://github.com/yomidevs/yomitan/tree/26.10.12.0 .
Before publicly distributing a combined archive, include the exact corresponding
source archive and complete license notices, and review its distribution terms.
The build script is for private local testing; it does not publish an archive.

The native host uses Microsoft.Web.WebView2 1.0.2903.40, under Microsoft's
[WebView2 SDK license](https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.2903.40/License).
The Windows WebView2 runtime is installed separately, not redistributed here.

User dictionaries are imported into the user's separate WebView2 profile.
They are not included in this repository or plugin packages. Each dictionary's
own rights and conditions continue to apply.
