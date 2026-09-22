# BetterDownload

作者：XIAOMING6680。

本插件为独立项目，与网易云音乐及 BetterNCM 无隶属关系。

源代码以 GPL-3.0-or-later 发布，见 LICENSE。

BetterNCM 接口依据官方开源实现核对：
https://github.com/BetterNCM/js-framework
https://github.com/std-microblock/chromatic/tree/v2

NCM 容器布局和算法行为参考 taurusxin/ncmdump；本项目使用 .NET 自带 AES，未打包该项目的 C++、AES 或 TagLib 实现：
https://github.com/taurusxin/ncmdump

本地程序不访问网络、不读取账户凭据、不获取额外歌曲资源。

包含 TagLibSharp 2.3.0（LGPL-2.1，见 TAGLIB-LICENSE），用于音频内嵌标签与封面。
未修改的二进制来自 NuGet，构建脚本固定版本并校验 SHA256；可替换兼容版本的 DLL。
对应完整源码：https://github.com/mono/taglib-sharp/tree/TaglibSharp-2.3.0.0
