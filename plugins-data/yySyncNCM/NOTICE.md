# 来源与第三方声明

## 本仓库来源

- 直接 fork 来源：[wuyan1337/yySync](https://github.com/wuyan1337/yySync)。BetterNCM 改造开始前的本地基线为提交 `1820a20`。
- 该基线包含 Steam 会话、状态格式化、配置和 `PlayerInfo`；当前版本将相关代码整理到 `backend/managed` 并按插件需求修改。
- 插件改造由 Yanxxxi 的个人仓库维护，包括设置页面、原生接口、进程内 .NET 宿主、双架构打包、登录持久化和测试。
- 原独立版项目元数据声明作者为 Kyle、kri_YamiHikari；原 LICENSE 中的 `Copyright (c) 2018 Kyle` 完整保留。原 README 列出的参考项目在本仓库 README 中继续致谢。
- BetterNCM 与 InfLink-rs 的接口和实现为插件适配提供参考；InfLink-rs 是外部插件依赖，其源码和二进制均不在 yySync-NCM 插件包中。

本仓库自身代码沿用根目录 MIT LICENSE。以下依赖按各自许可证提供，不因本仓库 LICENSE 而改变许可。

## 随插件分发的依赖

| 组件 | 版本 | 许可证 | 源码 |
| --- | --- | --- | --- |
| SteamKit2 | 3.4.0 | LGPL-2.1-only | [SteamRE/SteamKit，3.4.0](https://github.com/SteamRE/SteamKit/tree/3.4.0) |
| protobuf-net / protobuf-net.Core | 3.2.56 | Apache-2.0 | [protobuf-net，dfdfce6](https://github.com/protobuf-net/protobuf-net/tree/dfdfce61a739cfd76f05fcdacf8a4b3b9e94e684) |
| ZstdSharp.Port | 0.8.7 | MIT | [ZstdSharp，0ee6121](https://github.com/oleg-st/ZstdSharp/tree/0ee6121aaa173b42e68d3c6c8816a68e910e0557) |
| System.IO.Hashing | 10.0.1 | MIT | [dotnet/dotnet，fad253f](https://github.com/dotnet/dotnet/tree/fad253f51b461736dfd3cd9c15977bb7493becef) |
| .NET Runtime / nethost / hostfxr | 构建所选 .NET 9 版本 | 随附 .NET 许可证及第三方声明 | [dotnet/runtime](https://github.com/dotnet/runtime) |

依赖 DLL 从 NuGet 和已安装的 .NET 运行库复制，未修改其源码或二进制。SteamKit2 保持为独立 DLL；插件源码、构建脚本和对应依赖源码地址公开，开发者可修改并重新构建插件或依赖。

许可证、依赖原有版权声明位于 `licenses/`。每套私有运行库还包含自身 `LICENSE.txt` 和 `ThirdPartyNotices.txt`。构建脚本将根 LICENSE、本文及 `licenses/` 一起打入插件包。

升级依赖时需同时更新本表及对应的许可证、版权声明文件。
