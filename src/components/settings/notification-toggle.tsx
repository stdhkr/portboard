import { useAtom } from "jotai";
import { Bell, BellOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/brutalist";
import { notificationsEnabledAtom } from "@/store/port-store";

export function NotificationToggle() {
	const { t } = useTranslation();
	const [notificationsEnabled, setNotificationsEnabled] = useAtom(notificationsEnabledAtom);

	const handleToggle = async () => {
		if (!notificationsEnabled) {
			// Enabling notifications - request permission
			if (!("Notification" in window)) {
				toast.error(t("settings.notifications.notSupported"));
				return;
			}

			if (Notification.permission === "denied") {
				toast.error(t("settings.notifications.permissionDenied"));
				return;
			}

			if (Notification.permission === "default") {
				const permission = await Notification.requestPermission();
				if (permission !== "granted") {
					toast.error(t("settings.notifications.permissionDenied"));
					return;
				}
			}

			setNotificationsEnabled(true);
			toast.success(t("settings.notifications.enabled"));

			// Test notification
			new Notification("Portboard Notifications Enabled", {
				body: "You will now receive notifications when new ports are opened.",
			});
		} else {
			// Disabling notifications
			setNotificationsEnabled(false);
			toast.success(t("settings.notifications.disabled"));
		}
	};

	return (
		<Button variant="outline" size="sm" onClick={handleToggle} aria-label="Toggle notifications">
			{notificationsEnabled ? (
				<>
					<Bell className="h-4 w-4 mr-2" />
					{t("settings.notifications.on")}
				</>
			) : (
				<>
					<BellOff className="h-4 w-4 mr-2" />
					{t("settings.notifications.off")}
				</>
			)}
		</Button>
	);
}
