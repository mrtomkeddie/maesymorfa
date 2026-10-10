'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, Calendar, ChevronRight, Clock } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { UrgentBanner } from '@/components/ui/UrgentBanner';
import { useNews } from '@/hooks/useNews';
import { useCalendar } from '@/hooks/useCalendar';
import { format } from 'date-fns';
import { cy as cyLocale } from 'date-fns/locale';
import { UrgentNewsPost } from '@/lib/mockNews';
import { RainbowHero } from '@/components/home/RainbowHero';
import { TodayAtSchool } from '@/components/home/TodayAtSchool';
import { GamePreview } from '@/components/home/GamePreview';
import { AddToCalendar } from '@/components/AddToCalendar';
import { Reveal, RevealGroup, RevealItem } from '@/components/motion/Reveal';

const content = {
  en: {
    hero: {
      eyebrow: 'Primary Community School',
      titleBefore: 'Welcome to',
      titleName: 'Maes Y Morfa',
      subtitle: 'A caring, ambitious school where every child is valued and inspired.',
      button: 'Explore Our School',
      secondary: 'Latest News',
      imageAlt: 'A crayon drawing of the front of Ysgol Maes Y Morfa',
    },
    upcomingEvents: {
      heading: 'Upcoming Events',
      viewAll: 'Full calendar',
      none: 'No upcoming events scheduled.',
    },
    latestNews: {
      heading: 'Latest News',
      readMore: 'Read More',
      viewAll: 'All news',
    },
    game: {
      title: 'Morfa Runner',
      howTo: 'How to Play',
      body: 'Help our Ysgol Maes Y Morfa student race through the school grounds! Jump over obstacles and collect values for bonus points. The longer you run, the faster it gets!',
      keys: 'Press SPACE to jump, and again in mid-air for a double jump!',
      touch: 'Tap the screen to jump, and tap again in mid-air for a double jump!',
      play: 'Play Now',
    },
  },
  cy: {
    hero: {
      eyebrow: 'Ysgol Gymunedol Gynradd',
      titleBefore: 'Croeso i',
      titleName: 'Maes Y Morfa',
      subtitle: 'Ysgol ofalgar, uchelgeisiol lle mae pob plentyn yn cael ei werthfawrogi a’i ysbrydoli.',
      button: 'Archwiliwch Ein Hysgol',
      secondary: 'Newyddion Diweddaraf',
      imageAlt: 'Llun creon o flaen Ysgol Maes Y Morfa',
    },
    upcomingEvents: {
      heading: 'Digwyddiadau i Ddod',
      viewAll: 'Calendr llawn',
      none: 'Dim digwyddiadau i ddod.',
    },
    latestNews: {
      heading: 'Newyddion Diweddaraf',
      readMore: 'Darllen Mwy',
      viewAll: 'Pob newyddion',
    },
    game: {
      title: 'Rhedwr Morfa',
      howTo: 'Sut i Chwarae',
      body: 'Helpwch ein myfyriwr o Ysgol Maes Y Morfa i rasio drwy dir yr ysgol! Neidiwch dros rwystrau a chasglu gwerthoedd am bwyntiau bonws. Po hiraf y byddwch chi\'n rhedeg, y cyflymaf y bydd hi\'n mynd!',
      keys: 'Pwyswch SPACE i neidio, ac eto yn yr awyr am naid ddwbl!',
      touch: 'Tapiwch y sgrin i neidio, ac eto yn yr awyr am naid ddwbl!',
      play: 'Chwarae Nawr',
    },
  },
};

// True on phones and tablets, where there is no space bar.
function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);
  return touch;
}

export default function HomePage() {
  const { language } = useLanguage();
  const t = content[language];
  const isTouch = useIsTouch();
  const locale = language === 'cy' ? { locale: cyLocale } : undefined;

  const { latestNews, urgentNews } = useNews();
  const { events: allEvents } = useCalendar();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Upcoming events for the whole school (events with no audience list count as whole-school)
  const upcomingEvents = allEvents
    .filter((event) => {
      const relevantTo = (event as { relevantTo?: string[] }).relevantTo;
      return new Date(event.start) >= today && (!relevantTo || relevantTo.includes('All'));
    })
    .slice(0, 4);

  const bannerPost = urgentNews as UrgentNewsPost | undefined;

  return (
    <div className="bg-background">
      {bannerPost && <UrgentBanner post={bannerPost} />}

      <RainbowHero t={t.hero} />

      <TodayAtSchool />

      {/* News and events side by side, so dates are visible without a click */}
      <section className="w-full pb-16 md:pb-24">
        <div className="container mx-auto max-w-7xl px-6 md:px-8 grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h2 className="font-headline text-[1.75rem] md:text-4xl font-bold">{t.latestNews.heading}</h2>
              <Link href="/news" className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                {t.latestNews.viewAll} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <RevealGroup className="divide-y border-y">
              {latestNews.slice(0, 3).map((post) => {
                const title = language === 'en' ? post.title_en : post.title_cy;
                const body = language === 'en' ? post.body_en : post.body_cy;
                const plainBody = body.replace(/<[^>]*>?/gm, '');
                return (
                  <RevealItem key={post.id}>
                    <Link href={`/news/${post.slug}`} className="group grid gap-1 py-5 sm:grid-cols-[7rem_1fr] sm:gap-6">
                      <span className="text-sm font-medium text-muted-foreground tabular-nums pt-1" suppressHydrationWarning>
                        {new Date(post.date).toLocaleDateString(language === 'cy' ? 'cy-GB' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <div>
                        <h3 className="font-headline text-xl md:text-2xl font-semibold leading-snug group-hover:text-primary transition-colors">
                          {title}
                        </h3>
                        <p className="mt-1 text-muted-foreground line-clamp-2">{plainBody}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                          {t.latestNews.readMore}
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </div>
                    </Link>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-4 mb-6">
              <h2 className="font-headline text-[1.75rem] md:text-4xl font-bold">{t.upcomingEvents.heading}</h2>
              <Link href="/events" className="shrink-0 whitespace-nowrap text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                {t.upcomingEvents.viewAll} <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {upcomingEvents.length > 0 ? (
              <RevealGroup className="space-y-3">
                {upcomingEvents.map((event) => (
                  <RevealItem key={event.id}>
                    <Link href="/events" className="group flex items-center gap-4 rounded-2xl bg-secondary/60 p-4 transition-colors hover:bg-secondary">
                      <div className="shrink-0 w-14 rounded-xl bg-white py-2 text-center shadow-sm">
                        <span className="block font-headline text-2xl font-bold leading-none">{format(new Date(event.start), 'dd')}</span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{format(new Date(event.start), 'MMM', locale)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold leading-tight">{language === 'en' ? event.title_en : event.title_cy}</p>
                        {!event.allDay && (
                          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" /> {format(new Date(event.start), 'p')}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </Link>
                  </RevealItem>
                ))}
              </RevealGroup>
            ) : (
              <div className="rounded-2xl bg-secondary/60 py-12 text-center text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{t.upcomingEvents.none}</p>
              </div>
            )}
            <div className="mt-4">
              <AddToCalendar className="w-full sm:w-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Morfa Runner */}
      <section className="w-full py-16 md:py-24 bg-primary text-primary-foreground overflow-hidden relative">
        <div className="container mx-auto max-w-7xl px-6 md:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <Reveal x={-40} className="flex-1 space-y-6 lg:text-left z-10">
              <div>
                <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tight mb-6">{t.game.title}</h2>
                <h3 className="font-bold text-xl mb-2 text-primary-foreground/90">{t.game.howTo}</h3>
                <p className="text-primary-foreground/90 text-lg leading-relaxed max-w-xl">{t.game.body}</p>
                <p className="text-primary-foreground font-bold mt-2 text-lg">{isTouch ? t.game.touch : t.game.keys}</p>
              </div>
              <div className="pt-4">
                <Button
                  asChild
                  className="bg-white text-primary hover:bg-gray-100 hover:text-primary rounded-full px-8 py-6 text-lg font-semibold transition-transform hover:scale-105 shadow-xl"
                >
                  <Link href="/play">
                    {t.game.play} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </Reveal>

            <Reveal x={40} delay={0.1} className="flex-1 w-full max-w-xl">
              <div className="relative w-full overflow-hidden rounded-3xl shadow-2xl border-4 border-white/20 aspect-video bg-black">
                <GamePreview title="Morfa Runner Preview" />
                <Link href="/play" className="absolute inset-0" aria-label={t.game.play} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
