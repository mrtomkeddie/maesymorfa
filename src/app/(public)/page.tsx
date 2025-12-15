'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Shirt, Utensils, Clock, Calendar, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { UrgentBanner } from '@/components/ui/UrgentBanner';
import { useNews } from '@/hooks/useNews';
import { useCalendar } from '@/hooks/useCalendar';
import { format } from 'date-fns';
import { UrgentNewsPost } from '@/lib/mockNews';
import { QuickLinks } from '@/components/QuickLinks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const content = {
  en: {
    hero: {
      title: 'Welcome to Ysgol Maes Y Morfa Primary School',
      subtitle: 'A caring, ambitious school where every child is valued and inspired.',
      button: 'Explore Our School'
    },
    keyInfo: {
      heading: 'Key Information',
      buttons: [
        { icon: Calendar, label: 'Term Dates', href: '/key-info', docCategory: 'Term Dates' },
        { icon: Shirt, label: 'Uniform Policy', href: '/key-info', docCategory: 'Uniform' },
        { icon: Utensils, label: 'Lunch Menu', href: '/key-info', docCategory: 'Lunch Menu' }
      ]
    },
    upcomingEvents: {
      heading: 'Upcoming Events',
      viewAll: 'View Full Calendar'
    },
    latestNews: {
      heading: 'Latest News',
      readMore: 'Read More',
      viewAll: 'View All News'
    },
    cta: {
      heading: 'Are you a Maes Y Morfa parent?',
      body: 'Log in to the Parent Portal to check your child’s progress, report absences, and get the latest updates—quickly and securely.',
      button: 'Go to Parent Portal'
    }
  },
  cy: {
    hero: {
      title: 'Croeso i Ysgol Gynradd Maes Y Morfa',
      subtitle: 'Ysgol ofalgar, uchelgeisiol lle mae pob plentyn yn cael ei werthfawrogi a’i ysbrydoli.',
      button: 'Archwiliwch Ein Hysgol'
    },
    keyInfo: {
      heading: 'Gwybodaeth Allweddol',
      buttons: [
        { icon: Calendar, label: 'Dyddiadau Tymor', href: '/key-info', docCategory: 'Term Dates' },
        { icon: Shirt, label: 'Polisi Gwisg Ysgol', href: '/key-info', docCategory: 'Uniform' },
        { icon: Utensils, label: 'Bwydlen Ginio', href: '/key-info', docCategory: 'Lunch Menu' }
      ]
    },
    upcomingEvents: {
      heading: 'Digwyddiadau i Ddod',
      viewAll: 'Gweld y Calendr Llawn'
    },
    latestNews: {
      heading: 'Newyddion Diweddaraf',
      readMore: 'Darllen Mwy',
      viewAll: 'Gweld Pob Newyddion'
    },
    cta: {
      heading: 'Ydych chi’n rhiant Maes Y Morfa?',
      body: 'Mewngofnodwch i\'r Porth Rieni i wirio cynnydd eich plentyn, riportio absenoldebau, a chael y diweddariadau diweddaraf—yn gyflym ac yn ddiogel.',
      button: 'Ewch i Borth Rieni'
    }
  }
};


export default function HomePage() {
  const { language } = useLanguage();
  const t = content[language];

  // Use hooks instead of direct mock access
  const { latestNews, urgentNews } = useNews();
  const { events: allEvents } = useCalendar(); // Get all events, filter here for homepage specifics if needed

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Simple filter for homepage: upcoming events relevant to All or general
  const upcomingEvents = allEvents
    .filter(event => new Date(event.start) >= today && (event.relevantTo?.includes('All') || !event.relevantTo))
    .slice(0, 3);

  // Cast urgentNews to the correct type to ensure TS knows it's always urgent if present, though finding it from array helps
  // Actually useNews returns NewsPost | undefined. UrgentNewsPost has isUrgent: true.
  // We can just pass it as NewsPost if the component accepts it, or cast it.
  const bannerPost = urgentNews as UrgentNewsPost | undefined;

  return (
    <div className="bg-background">
      {bannerPost && <UrgentBanner post={bannerPost} />}

      {/* Hero Section */}
      <section className="relative w-full h-[80vh] md:h-[90vh] flex items-center justify-center text-center text-white overflow-hidden">
        <Image
          src="https://i.postimg.cc/RFZsjTxj/Chat-GPT-Image-Jul-25-2025-08-43-22-AM.png"
          alt="A vibrant classroom with children learning"
          fill
          priority
          className="absolute inset-0 z-0 object-cover"
          data-ai-hint="vibrant classroom learning"
        />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <div className="relative z-20 container mx-auto max-w-4xl px-8">
          <h1 className="font-headline text-3xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl">
            {t.hero.title}
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/90 md:text-xl">
            {t.hero.subtitle}
          </p>
          <div className="mt-8">
            <Button size="lg" asChild>
              <Link href="/about">{t.hero.button}</Link>
            </Button>
          </div>
        </div>
      </section>

      <QuickLinks />

      <section className="w-full pb-16 md:pb-24 bg-secondary/30 pt-8">
        <div className="container mx-auto max-w-7xl px-8">

          <Tabs defaultValue="news" className="w-full">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <TabsList className="bg-white/50 backdrop-blur border border-white/20 p-1 h-auto rounded-full">
                <TabsTrigger value="news" className="rounded-full px-6 py-2 text-base data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  {t.latestNews.heading}
                </TabsTrigger>
                <TabsTrigger value="events" className="rounded-full px-6 py-2 text-base data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                  {t.upcomingEvents.heading}
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/news">{t.latestNews.viewAll}</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link href="/calendar">{t.upcomingEvents.viewAll}</Link>
                </Button>
              </div>
            </div>

            <TabsContent value="news" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {latestNews.slice(0, 3).map((post) => {
                  const title = language === 'en' ? post.title_en : post.title_cy;
                  const body = language === 'en' ? post.body_en : post.body_cy;
                  const plainBody = body.replace(/<[^>]*>?/gm, '');

                  return (
                    <Link key={post.id} href={`/news/${post.slug}`} className="block h-full">
                      <Card className="h-full border-l-4 border-l-transparent hover:border-l-primary shadow-sm hover:shadow-lg transition-all duration-300 bg-card group relative overflow-hidden">

                        <CardContent className="p-4 md:p-5 flex flex-col h-full relative z-10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[10px] uppercase font-bold text-primary ring-1 ring-inset ring-primary/20">
                              {language === 'en' ? 'NEWS' : 'NEWYDDION'}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground tabular-nums" suppressHydrationWarning>
                              {new Date(post.date).toLocaleDateString(language === 'cy' ? 'cy-GB' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>

                          <h3 className="text-lg md:text-xl font-bold mb-2 leading-tight group-hover:text-primary transition-colors">
                            {title}
                          </h3>

                          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-4 flex-1">
                            {plainBody.substring(0, 150)}...
                          </p>

                          <div className="mt-auto pt-3 border-t border-border/50">
                            <span className="text-primary font-bold text-xs uppercase tracking-wide flex items-center group-hover:translate-x-1 transition-transform">
                              {t.latestNews.readMore}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {upcomingEvents.length > 0 ? (
                  upcomingEvents.map(event => (
                    <Card key={event.id} className="border-l-[6px] border-l-primary shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-5 flex items-start gap-4">
                        <div className="text-center font-bold text-muted-foreground border-r pr-5 min-w-[4rem]">
                          <span className="block text-2xl text-foreground font-extrabold">{format(new Date(event.start), 'dd')}</span>
                          <span className="text-xs font-bold uppercase tracking-wider">{format(new Date(event.start), 'MMM')}</span>
                        </div>
                        <div>
                          <p className="font-bold text-base leading-tight mb-1">{language === 'en' ? event.title_en : event.title_cy}</p>
                          {!event.allDay && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
                              <Clock className="h-3 w-3" /> {format(new Date(event.start), 'p')}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground/50" />
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="col-span-full text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No upcoming events scheduled.</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Login Prompt Section Replaced by Game */}
      <section className="w-full py-16 md:py-24 bg-primary text-primary-foreground overflow-hidden relative">
        <div className="container mx-auto max-w-7xl px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">

            {/* Content Side */}
            <div className="flex-1 space-y-6 lg:text-left z-10">
              <div>
                <h2 className="text-3xl md:text-5xl font-bold font-headline tracking-tight mb-6">
                  {language === 'en' ? 'Morfa Runner' : 'Rhedwr Morfa'}
                </h2>
                <h3 className="font-bold text-xl mb-2 text-primary-foreground/90">
                  {language === 'en' ? 'How to Play' : 'Sut i Chwarae'}
                </h3>
                <p className="text-primary-foreground/90 text-lg leading-relaxed max-w-xl">
                  {language === 'en'
                    ? 'Help our Ysgol Maes Y Morfa student race through the school grounds! Jump over obstacles and collect values for bonus points. The longer you run, the faster it gets!'
                    : 'Helpwch ein myfyriwr o Ysgol Maes Y Morfa i rasio drwy dir yr ysgol! Neidiwch dros rwystrau a chasglu gwerthoedd am bwyntiau bonws. Po hiraf y byddwch chi\'n rhedeg, y cyflymaf y bydd hi\'n mynd!'}
                </p>
                <p className="text-primary-foreground font-bold mt-2 text-lg">
                  {language === 'en' ? 'Press SPACE to jump, and again in mid-air for a double jump!' : 'Pwyswch SPACE i neidio, ac eto yn yr awyr am naid ddwbl!'}
                </p>
              </div>

              <div className="pt-4">
                <Button
                  asChild
                  className="bg-white text-primary hover:bg-gray-100 hover:text-primary rounded-full px-8 py-6 text-lg font-semibold transition-transform hover:scale-105 shadow-xl"
                >
                  <Link href="/play">
                    {language === 'en' ? 'Play Now' : 'Chwarae Nawr'} <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Game Elements Side - Preview */}
            <div className="flex-1 w-full max-w-xl lg:max-w-xl relative overflow-hidden rounded-3xl shadow-2xl border-4 border-white/20 aspect-video bg-black">
              <iframe
                src="/morfa-runner/index.html?preview=true"
                className="w-full h-full border-0 pointer-events-none transform scale-100 origin-top-left"
                title="Morfa Runner Preview"
                tabIndex={-1}
              />
              <div className="absolute inset-0 bg-transparent pointer-events-auto" /> {/* Overlay to capture clicks if needed, or let standard events bubble */}

              {/* Optional: Add a 'LIVE PREVIEW' badge? */}
              <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded animate-pulse shadow-md">
                LIVE PREVIEW
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
