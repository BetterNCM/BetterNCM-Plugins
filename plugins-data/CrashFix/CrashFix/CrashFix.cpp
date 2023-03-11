// CrashFix.cpp : 定义 DLL 的导出函数。
//

#include "pch.h"
#include "framework.h"
#include "CrashFix.h"
#include <string>
#include <iosfwd>
#include <iostream>

typedef int(__thiscall* pTaglibFilenameDestructor)(void* _this);
PVOID o_TaglibFilenameDestructor;
PVOID o_renderRestore;


char buffer[1000];
__declspec(naked) int* __cdecl h_TaglibFilenameDestructor(void* this_) {
	__asm {
		mov eax, [esp + 4]
	}
	// output this_ as hex

	sprintf_s(buffer, "\n[CrashFix] TaglibFilenameDestructor called on: 0x%p\n", this_);
	std::cout << buffer;


	__asm {
		retn
	}
}

__declspec(naked) char __cdecl h_renderRestore(int* this_, int a2, int a3, void* a4) {
	__asm {
		mov eax, [esp + 4]
	}
	// output this_ as hex

	sprintf_s(buffer, "\n[CrashFix] RenderRestore called on: 0x%p, ignoring...\n", this_);
	std::cout << buffer;


	__asm {
		retn
	}
}

#define DECL_PTR(name, exprs) o_##name = exprs 0; if (o_##name)
#define PV(v0,v1,v2,addr) ((*api->ncmVersion)[0]==v0 && (*api->ncmVersion)[1]==v1 && (*api->ncmVersion)[2] == v2) ? (PVOID)(addr) :

int CRASHFIX_API BetterNCMPluginMain(BetterNCMNativePlugin::PluginAPI* api)
{


	if (api->processType & Main) {
		DetourTransactionBegin();
		DetourUpdateThread(GetCurrentThread());

		HMODULE hCloudMusic = GetModuleHandle(L"cloudmusic.dll");

		o_TaglibFilenameDestructor = DetourFindFunction("cloudmusic.dll", "??1FileName@TagLib@@QAE@XZ");
		// public: __thiscall TagLib::FileName::~FileName(void)
		// attempt to resolve the problem of secondary release
		DetourAttach(&o_TaglibFilenameDestructor, (PVOID)h_TaglibFilenameDestructor);
		{
			char buffer[1000];
			sprintf_s(buffer, "\n\n\nBetterNCM CrashFix Hook Performed:\n\t- o_TaglibFilenameDestructor: %p -> %p\n", o_TaglibFilenameDestructor, h_TaglibFilenameDestructor);
			std::cout << buffer;
		}

		DECL_PTR(renderRestore,
			PV(2, 10, 7, hCloudMusic + 0x001D68C0)
		) {
			DetourAttach(&o_renderRestore, (PVOID)h_renderRestore);

			char buffer[1000];
			sprintf_s(buffer, "\t- o_renderRestore: %p -> %p\n", o_renderRestore, h_renderRestore);
			std::cout << buffer;
		}





		DetourTransactionCommit();
	}

	return 0;
}
