// InfLink.cpp : 定义 DLL 的导出函数。
//
#define NATIVE_PLUGIN_CPP_EXTENSIONS

#include "pch.h"
#include "framework.h"
#include "InfLink.h"
#include <functional>
#include <string>
#include <thread>



char* testApi(void** args);
char* enableSMTC(void** args);
char* disableSMTC(void** args);
char* updateSMTC(void** args);
char* registerSMTCEventCallback(void** args);
char* updateSMTCPlayState(void** args);

int BetterNCMPluginMain(BetterNCMNativePlugin::PluginAPI* api)
{
	api->addNativeAPI(new BetterNCMNativePlugin::NativeAPIType[0]{  }, 0, "inflink.test", testApi);
	api->addNativeAPI(new BetterNCMNativePlugin::NativeAPIType[0]{  }, 0, "inflink.enableSMTC", enableSMTC);
	api->addNativeAPI(new BetterNCMNativePlugin::NativeAPIType[0]{  }, 0, "inflink.disableSMTC", disableSMTC);
	api->addNativeAPI(new BetterNCMNativePlugin::NativeAPIType[4]{
		BetterNCMNativePlugin::NativeAPIType::String,
		BetterNCMNativePlugin::NativeAPIType::String,
		BetterNCMNativePlugin::NativeAPIType::String,
		BetterNCMNativePlugin::NativeAPIType::String },
		4, "inflink.updateSMTC", updateSMTC);

	api->addNativeAPI(new BetterNCMNativePlugin::NativeAPIType[1]{
	BetterNCMNativePlugin::NativeAPIType::V8Value },
	1, "inflink.registerSMTCEventCallback", registerSMTCEventCallback);

	api->addNativeAPI(new BetterNCMNativePlugin::NativeAPIType[1]{ BetterNCMNativePlugin::NativeAPIType::Int },
		1, "inflink.updateSMTCPlayState", updateSMTCPlayState);
	return 0;
}

