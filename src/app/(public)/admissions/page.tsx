'use client';

import { useLanguage } from './../LanguageProvider';
import { Phone, Mail, Download, ExternalLink, School, CalendarCheck, FileText, Sparkles } from "lucide-react";
import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { SiteSettings } from '@/lib/types';
import { PageHeader } from '@/components/public/PageHeader';
import { SectionHeading, Tile, TileLabel, TileTitle, pillLink } from '@/components/public/Tiles';

// Used until the school's settings load, and if they cannot be read
const OFFICE = { phone: '01554 772945', email: 'admin@maesymorfa.cymru' };

const content = {
  en: {
    title: "Admissions",
    subtitle: "Join Maes Y Morfa Primary School",
    intro: "We welcome applications for children of all backgrounds and abilities. If you are interested in joining our school, here’s how to get started:",
    howToApply: "How to Apply",
    step: (n: number) => `Step ${n}`,
    step1Title: "Contact us",
    step1Body: "Phone the school office or email us to arrange a visit or request an admissions pack.",
    step2Title: "Complete an application form",
    step2Body: "Download our application form below or collect one from the school office. Fill it in and return it to us—either by email, post, or in person.",
    downloadButton: "Download Application Form",
    step3Title: "Arrange a school visit",
    step3Body: "We strongly encourage prospective parents and children to visit. You’ll meet staff, see our facilities, and ask any questions.",
    policyTitle: "Admissions Policy",
    policyBody: "We follow Carmarthenshire Local Authority’s admissions criteria. For detailed admissions criteria and procedures, see the link below.",
    policyLink: "Carmarthenshire LA Admissions",
    startingTitle: "Starting School",
    startingBody1: "Once your place is confirmed, we will contact you with a start date and induction details.",
    startingBody2: "If your child is joining part-way through the year, we’ll work with you to make the transition as smooth as possible.",
    helpTitle: "Need help?",
    helpBody: "Contact the school office—we’re happy to answer any questions about the process.",
  },
  cy: {
    title: "Derbyniadau",
    subtitle: "Ymunwch ag Ysgol Gynradd Maes Y Morfa",
    intro: "Rydym yn croesawu ceisiadau gan blant o bob cefndir a gallu. Os oes gennych ddiddordeb mewn ymuno â'n hysgol, dyma sut i ddechrau:",
    howToApply: "Sut i Ymgeisio",
    step: (n: number) => `Cam ${n}`,
    step1Title: "Cysylltwch â Ni",
    step1Body: "Ffoniwch swyddfa'r ysgol neu anfonwch e-bost atom i drefnu ymweliad neu ofyn am becyn derbyn.",
    step2Title: "Cwblhewch Ffurflen Gais",
    step2Body: "Lawrlwythwch ein ffurflen gais isod neu casglwch un o swyddfa'r ysgol. Llenwch hi a'i dychwelyd atom—naill ai drwy e-bost, post, neu'n bersonol.",
    downloadButton: "Lawrlwytho'r Ffurflen Gais",
    step3Title: "Trefnwch Ymweliad ag Ysgol",
    step3Body: "Rydym yn annog darpar rieni a phlant i ymweld. Byddwch yn cwrdd â staff, yn gweld ein cyfleusterau, ac yn gofyn unrhyw gwestiynau.",
    policyTitle: "Polisi Derbyniadau",
    policyBody: "Rydym yn dilyn meini prawf derbyn Awdurdod Lleol Sir Gaerfyrddin. Am feini prawf a gweithdrefnau derbyn manwl, gweler y ddolen isod.",
    policyLink: "Derbyniadau ALl Sir Gâr",
    startingTitle: "Dechrau'r Ysgol",
    startingBody1: "Unwaith y bydd eich lle wedi'i gadarnhau, byddwn yn cysylltu â chi gyda dyddiad dechrau a manylion ymsefydlu.",
    startingBody2: "Os yw'ch plentyn yn ymuno'n rhan-ffordd drwy'r flwyddyn, byddwn yn gweithio gyda chi i wneud y trosglwyddiad mor llyfn â phosibl.",
    helpTitle: "Angen cymorth?",
    helpBody: "Cysylltwch â swyddfa'r ysgol—rydym yn hapus i ateb unrhyw gwestiynau am y broses.",
  }
};

const primaryButton = 'inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90';

export default function AdmissionsPage() {
    const { language } = useLanguage();
    const t = content[language];
    // The office phone and email come from the school's settings, the same place as the footer and Contact page
    const [office, setOffice] = useState(OFFICE);

    useEffect(() => {
        db.getSiteSettings()
            .then((s: SiteSettings | null) => s && setOffice({ phone: s.phone || OFFICE.phone, email: s.email || OFFICE.email }))
            .catch(console.error);
    }, []);

    const tel = `tel:${office.phone.replace(/\s/g, '')}`;

    return (
        <div className="bg-background">
            <PageHeader title={t.title} intro={t.subtitle} />

            <div className="container mx-auto max-w-5xl px-6 pb-20 pt-4 md:px-8 space-y-16">
                <p className="mx-auto max-w-2xl text-center text-lg text-foreground/90">{t.intro}</p>

                <section>
                    <SectionHeading>{t.howToApply}</SectionHeading>
                    <ol className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <li className="h-full">
                            <Tile tone="rose" className="h-full">
                                <TileLabel tone="rose" icon={Phone}>{t.step(1)}</TileLabel>
                                <TileTitle as="h3">{t.step1Title}</TileTitle>
                                <p className="mt-2 text-sm text-muted-foreground">{t.step1Body}</p>
                                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                                    <a href={tel} className={pillLink}><Phone className="h-4 w-4" />{office.phone}</a>
                                    <a href={`mailto:${office.email}`} className={pillLink}><Mail className="h-4 w-4" />{office.email}</a>
                                </div>
                            </Tile>
                        </li>
                        <li className="h-full">
                            <Tile tone="sky" className="h-full">
                                <TileLabel tone="sky" icon={FileText}>{t.step(2)}</TileLabel>
                                <TileTitle as="h3">{t.step2Title}</TileTitle>
                                <p className="mt-2 text-sm text-muted-foreground">{t.step2Body}</p>
                                <div className="mt-auto pt-4">
                                    <button type="button" className={pillLink}><Download className="h-4 w-4" />{t.downloadButton}</button>
                                </div>
                            </Tile>
                        </li>
                        <li className="h-full">
                            <Tile tone="emerald" className="h-full">
                                <TileLabel tone="emerald" icon={CalendarCheck}>{t.step(3)}</TileLabel>
                                <TileTitle as="h3">{t.step3Title}</TileTitle>
                                <p className="mt-2 text-sm text-muted-foreground">{t.step3Body}</p>
                            </Tile>
                        </li>
                    </ol>
                </section>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Tile tone="violet">
                        <TileLabel tone="violet" icon={School}>{t.policyTitle}</TileLabel>
                        <p className="mt-3 text-sm text-muted-foreground">{t.policyBody}</p>
                        <div className="mt-auto pt-4">
                            <a href="#" target="_blank" rel="noopener noreferrer" className={pillLink}>
                                {t.policyLink} <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </Tile>
                    <Tile tone="amber">
                        <TileLabel tone="amber" icon={Sparkles}>{t.startingTitle}</TileLabel>
                        <p className="mt-3 text-sm text-muted-foreground">{t.startingBody1}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{t.startingBody2}</p>
                    </Tile>
                </div>

                <div className="text-center">
                    <h2 className="font-headline text-2xl font-bold md:text-3xl">{t.helpTitle}</h2>
                    <p className="mt-2 text-muted-foreground">{t.helpBody}</p>
                    <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                        <a href={tel} className={primaryButton}><Phone className="h-4 w-4" />{office.phone}</a>
                        <a href={`mailto:${office.email}`} className={pillLink}><Mail className="h-4 w-4" />{office.email}</a>
                    </div>
                </div>
            </div>
        </div>
    );
}
