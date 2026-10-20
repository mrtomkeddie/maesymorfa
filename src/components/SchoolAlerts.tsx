'use client';

import { useEffect, useState } from 'react';
import { Bell, BellRing, Loader2, Share } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/app/(public)/LanguageProvider';
import { alertState, isIPhone, renewAlerts, turnOffAlerts, turnOnAlerts, type AlertState } from '@/lib/schoolAlerts';

// iOS has no Welsh, so its button names stay in English in both versions
const content = {
    en: {
        button: 'Get school alerts',
        buttonOn: 'School alerts on',
        offTitle: 'Urgent news on your phone',
        offBody: "We'll send an alert to this phone when something urgent happens, like the school closing for snow. Nothing else.",
        turnOn: 'Turn on alerts',
        askNote: 'Your phone will ask if we can send notifications. Tap Allow.',
        installTitle: 'Alerts on iPhone',
        installBody: 'iPhones only show our alerts from the Home Screen app. Add it once:',
        steps: ['In Safari, tap the Share button', 'Tap “Add to Home Screen”, then Add', 'Open Maes Y Morfa from your Home Screen and tap “Get school alerts”'],
        onTitle: 'Alerts are on',
        onBody: "We'll only send an alert when something is urgent, like a closure.",
        turnOff: 'Turn off alerts',
        blockedTitle: 'Notifications are blocked',
        blockedIPhone: 'To allow them, open Settings, then Notifications, then Maes Y Morfa, and turn on Allow Notifications.',
        blockedOther: 'To allow them, open the site settings in your browser (the icon beside our web address) and turn on Notifications. Then reload this page.',
        error: "That didn't work. Check your internet connection and try again.",
    },
    cy: {
        button: 'Cael rhybuddion ysgol',
        buttonOn: 'Rhybuddion ysgol ymlaen',
        offTitle: 'Newyddion brys ar eich ffôn',
        offBody: "Byddwn ni'n anfon rhybudd i'r ffôn hwn pan fydd rhywbeth brys yn digwydd, fel yr ysgol yn cau oherwydd eira. Dim byd arall.",
        turnOn: 'Troi rhybuddion ymlaen',
        askNote: "Bydd eich ffôn yn gofyn a gawn ni anfon hysbysiadau. Tapiwch Allow.",
        installTitle: 'Rhybuddion ar iPhone',
        installBody: "Dim ond o'r ap ar y sgrin gartref mae iPhone yn dangos ein rhybuddion. Ychwanegwch e unwaith:",
        steps: ['Yn Safari, tapiwch y botwm Share', 'Tapiwch “Add to Home Screen”, yna Add', 'Agorwch Maes Y Morfa o’ch sgrin gartref a thapio “Cael rhybuddion ysgol”'],
        onTitle: 'Mae rhybuddion ymlaen',
        onBody: "Dim ond pan fydd rhywbeth yn frys y byddwn ni'n anfon rhybudd, fel yr ysgol yn cau.",
        turnOff: 'Diffodd rhybuddion',
        blockedTitle: "Mae hysbysiadau wedi'u rhwystro",
        blockedIPhone: "I'w caniatáu, agorwch Settings, yna Notifications, yna Maes Y Morfa, a throi Allow Notifications ymlaen.",
        blockedOther: "I'w caniatáu, agorwch osodiadau'r wefan yn eich porwr (yr eicon wrth ymyl ein cyfeiriad gwe) a throi Notifications ymlaen. Yna ail-lwythwch y dudalen.",
        error: "Doedd hynny ddim wedi gweithio. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
    },
};

// A small button that signs this phone up for urgent school news. It asks the phone for permission
// only after a tap on "Turn on alerts", and on an iPhone that has not added the site to its Home
// Screen it shows how to do that instead (iPhones allow alerts only from there).
export function SchoolAlerts() {
    const { language } = useLanguage();
    const t = content[language];
    // Worked out after the page loads: the server cannot know what phone this is
    const [state, setState] = useState<AlertState>('hidden');
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const now = alertState();
        setState(now);
        if (now === 'on') renewAlerts().catch(() => {});
    }, []);

    if (state === 'hidden') return null;

    const run = async (action: () => Promise<AlertState>) => {
        setBusy(true);
        setFailed(false);
        try {
            setState(await action());
        } catch (error) {
            console.error('School alerts:', error);
            setFailed(true);
        } finally {
            setBusy(false);
        }
    };

    const on = state === 'on';
    const Icon = on ? BellRing : Bell;

    return (
        <Popover onOpenChange={() => setFailed(false)}>
            <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-rose-50 px-4 py-1.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-rose-100">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {on ? t.buttonOn : t.button}
            </PopoverTrigger>
            <PopoverContent align="start" collisionPadding={16} className="w-[min(21rem,calc(100vw-2rem))] rounded-2xl p-5">
                <div aria-live="polite" className="space-y-3 text-sm">
                    {state === 'install' && (
                        <>
                            <p className="font-headline text-lg font-semibold leading-snug">{t.installTitle}</p>
                            <p className="text-muted-foreground">{t.installBody}</p>
                            <ol className="space-y-2">
                                {t.steps.map((step, index) => (
                                    <li key={step} className="flex items-start gap-3">
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-primary">
                                            {index + 1}
                                        </span>
                                        <span className="pt-0.5">
                                            {step}
                                            {index === 0 && <Share className="ml-1.5 inline h-4 w-4 -translate-y-px text-sky-600" aria-hidden="true" />}
                                        </span>
                                    </li>
                                ))}
                            </ol>
                        </>
                    )}

                    {state === 'off' && (
                        <>
                            <p className="font-headline text-lg font-semibold leading-snug">{t.offTitle}</p>
                            <p className="text-muted-foreground">{t.offBody}</p>
                            <Button className="w-full rounded-full" disabled={busy} onClick={() => run(() => turnOnAlerts(language))}>
                                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.turnOn}
                            </Button>
                            <p className="text-xs text-muted-foreground">{t.askNote}</p>
                        </>
                    )}

                    {state === 'on' && (
                        <>
                            <p className="flex items-center gap-2 font-headline text-lg font-semibold leading-snug">
                                <BellRing className="h-5 w-5 text-primary" aria-hidden="true" /> {t.onTitle}
                            </p>
                            <p className="text-muted-foreground">{t.onBody}</p>
                            <Button variant="outline" className="w-full rounded-full" disabled={busy}
                                onClick={() => run(async () => { await turnOffAlerts(); return 'off'; })}>
                                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t.turnOff}
                            </Button>
                        </>
                    )}

                    {state === 'blocked' && (
                        <>
                            <p className="font-headline text-lg font-semibold leading-snug">{t.blockedTitle}</p>
                            <p className="text-muted-foreground">{isIPhone() ? t.blockedIPhone : t.blockedOther}</p>
                        </>
                    )}

                    {failed && <p className="font-medium text-destructive">{t.error}</p>}
                </div>
            </PopoverContent>
        </Popover>
    );
}
