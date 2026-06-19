const installButton = document.getElementById("install-app");
const iosInstallHelp = document.getElementById("ios-install-help");
let deferredInstallPrompt = null;

const standalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

function updateInstallControls() {
  installButton.hidden = standalone() || !deferredInstallPrompt;
  iosInstallHelp.hidden = standalone() || !ios();
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallControls();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallControls();
});

installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  await deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallControls();
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js"));
}
updateInstallControls();
