#pragma once
#include "pch.h"
#include <include/capi/cef_task_capi.h>
#include <include/capi/cef_v8_capi.h>
#include "winrt/Windows.Media.Control.h"
#include "winrt/Windows.Media.Playback.h"
#include <winrt/Windows.ApplicationModel.Core.h>
#include <winrt/Windows.Storage.Streams.h>
#include "winrt/Windows.Foundation.h"
#include "utils.cpp"
#include "InfLink.h"

using namespace winrt::Windows::Foundation;

using namespace winrt::Windows::Media::Playback;
using namespace winrt::Windows::Media;
using namespace winrt::Windows::Media::Control;

using namespace winrt;
using namespace winrt::Windows::Media::Control;
using namespace winrt::Windows::ApplicationModel::Core;

using namespace Windows::Storage::Streams;
BetterNCMNativePlugin::extensions::JSFunction* callback = nullptr;
std::optional<winrt::Windows::Media::Playback::MediaPlayer> mediaPlayer;

char* enableSMTC(void** args) {
	if (!mediaPlayer.has_value()) {
		mediaPlayer = MediaPlayer();


		mediaPlayer->SystemMediaTransportControls().ButtonPressed([&](SystemMediaTransportControls sender,
			SystemMediaTransportControlsButtonPressedEventArgs args) {
				auto btn = static_cast<int32_t>(args.Button());
		if (callback)(*callback)(btn);
			});
	}


	const auto commandManager = mediaPlayer->CommandManager();
	commandManager.IsEnabled(false);

	SystemMediaTransportControls smtc = mediaPlayer->SystemMediaTransportControls();

	smtc.PlaybackStatus(MediaPlaybackStatus::Playing);

	auto updater = smtc.DisplayUpdater();
	updater.ClearAll();
	updater.Type(MediaPlaybackType::Music);
	auto properties = updater.MusicProperties();

	properties.Title(to_hstring(std::string("Loading")));


	updater.Update();

	return nullptr;
}

char* disableSMTC(void** args) {
	if (!mediaPlayer.has_value())
		mediaPlayer = MediaPlayer();

	SystemMediaTransportControls smtc = mediaPlayer->SystemMediaTransportControls();

	smtc.IsEnabled(false);

	return nullptr;
}

char* updateSMTC(void** args) {
	if (!mediaPlayer.has_value())
		mediaPlayer = MediaPlayer();

	try {

		const auto commandManager = mediaPlayer->CommandManager();
		commandManager.IsEnabled(false);

		SystemMediaTransportControls smtc = mediaPlayer->SystemMediaTransportControls();

		smtc.IsEnabled(true);
		smtc.IsPlayEnabled(true);
		smtc.IsPauseEnabled(true);
		smtc.PlaybackStatus(MediaPlaybackStatus::Playing);

		auto updater = smtc.DisplayUpdater();
		updater.ClearAll();
		updater.Type(MediaPlaybackType::Music);

		auto imgurl = std::string((char*)args[3]);
		if (imgurl.length() > 0)
			updater.Thumbnail(RandomAccessStreamReference::CreateFromUri(
				Uri(to_hstring(imgurl))));

		auto properties = updater.MusicProperties();

		properties.Title(to_hstring(std::string((char*)args[0])));
		properties.AlbumTitle(to_hstring(std::string((char*)args[1])));

		properties.Artist(to_hstring(std::string((char*)args[2])));

		updater.Update();
	}
	catch (std::exception& e) {
		return Utils::to_cstr_dyn(e.what());
	}

	return nullptr;
}

char* updateSMTCPlayState(void** args) {
	try {
		int state = **(int**)args;

		SystemMediaTransportControls smtc = mediaPlayer->SystemMediaTransportControls();

		smtc.PlaybackStatus(static_cast<MediaPlaybackStatus>(state));
	}
	catch (std::exception& e) {
		return Utils::to_cstr_dyn(e.what());
	}

	return nullptr;
}

char* registerSMTCEventCallback(void** args)
{
	cef_v8value_t* val = ((cef_v8value_t*)(args[0]));
	callback = new BetterNCMNativePlugin::extensions::JSFunction(val);
	SystemMediaTransportControls smtc = mediaPlayer->SystemMediaTransportControls();
	smtc.IsEnabled(true);
	smtc.IsPlayEnabled(true);
	smtc.IsPauseEnabled(true);
	smtc.IsNextEnabled(true);
	smtc.IsPreviousEnabled(true);

	return nullptr;
}
