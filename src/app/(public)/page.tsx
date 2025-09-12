

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BookOpen, HeartHandshake, Sparkles, Newspaper, Calendar, Shirt, Utensils, Clock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from './LanguageProvider';
import { UrgentBanner } from '@/components/ui/UrgentBanner';
import { news as mockNews, UrgentNewsPost } from '@/lib/mockNews';
import { calendarEvents } from '@/lib/mockCalendar';
import { format } from 'date-fns';

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
  const latestNews = mockNews.filter(n => n.published).slice(0, 2);
  const urgentNews: UrgentNewsPost | undefined = mockNews.find(p => p.isUrgent && p.published) as UrgentNewsPost;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingEvents = calendarEvents
    .filter(event => new Date(event.start) >= today && event.relevantTo?.includes('All'))
    .slice(0, 3);

  return (
    <div className="bg-background">
      {urgentNews && <UrgentBanner post={urgentNews} />}

      {/* Hero Section */}
      <section className="relative w-full h-[80vh] md:h-[90vh] flex items-center justify-center text-center text-white overflow-hidden">
        <Image
          src="https://i.postimg.cc/RFZsjTxj/Chat-GPT-Image-Jul-25-2025-08-43-22-AM.png"
          alt="A vibrant classroom with children learning"
          fill
          priority={true}
          className="absolute inset-0 z-0 object-cover"
          data-ai-hint="vibrant classroom learning"
        />
        <div className="absolute inset-0 bg-black/60 z-10"></div>
        <div className="relative z-20 container mx-auto max-w-4xl px-8">
            <h1 className="font-headline text-4xl font-extrabold tracking-tighter sm:text-5xl md:text-6xl">
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

      <section className="w-full py-16 md:py-24 bg-secondary/30">
        <div className="container mx-auto max-w-7xl px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
               
                <div className="lg:col-span-2">
                    <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tighter text-foreground mb-8">
                        {t.latestNews.heading}
                    </h2>
                    <div className="space-y-6">
                        {latestNews.map((post) => {
                          const plainBody = post[`body_${language}`].replace(/<[^>]*>?/gm, '');
                          return (
                              <Card key={post.id} className="bg-background/70 shadow-lg border-0">
                                <CardContent className="p-6">
                                    <span className="text-sm text-muted-foreground mb-2 block">{new Date(post.date).toLocaleDateString(language === 'cy' ? 'cy-GB' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                    <h3 className="text-xl font-bold">{post[`title_${language}`]}</h3>
                                    <p className="text-muted-foreground line-clamp-2 mt-2">{plainBody.substring(0, 150)}...</p>
                                    <Button asChild variant="link" className="p-0 mt-4">
                                        <Link href={`/news/${post.slug}`}>{t.latestNews.readMore} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </CardContent>
                              </Card>
                          )
                        })}
                    </div>
                     <div className="mt-8">
                        <Button asChild variant="outline">
                            <Link href="/news">{t.latestNews.viewAll}</Link>
                        </Button>
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-8">
                    <div>
                        <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tighter text-foreground mb-8">
                            {t.keyInfo.heading}
                        </h2>
                         <div className="space-y-4">
                            {t.keyInfo.buttons.map(button => {
                                const Icon = button.icon;
                                return (
                                    <Button key={button.label} asChild variant="outline" className="w-full justify-start text-base py-6">
                                        <Link href={button.href}>
                                            <Icon className="mr-3 h-5 w-5 text-primary" />
                                            {button.label}
                                        </Link>
                                    </Button>
                                )
                            })}
                        </div>
                    </div>
                    
                    <div>
                        <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tighter text-foreground mb-8">
                            {t.upcomingEvents.heading}
                        </h2>
                        <Card className="bg-background/70 shadow-lg border-0">
                            <CardContent className="p-6 space-y-4">
                                {upcomingEvents.length > 0 ? (
                                    upcomingEvents.map(event => (
                                        <div key={event.id} className="flex items-start gap-4">
                                            <div className="text-center font-bold text-primary border-r pr-4">
                                                <div className="text-2xl">{format(new Date(event.start), 'dd')}</div>
                                                <div className="text-xs uppercase">{format(new Date(event.start), 'MMM')}</div>
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm leading-tight">{event[`title_${language}`]}</p>
                                                {!event.allDay && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Clock className="h-3 w-3" />{format(new Date(event.start), 'p')}</p>}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No upcoming events.</p>
                                )}
                                 <div className="pt-4">
                                    <Button asChild variant="secondary" className="w-full">
                                        <Link href="/calendar">{t.upcomingEvents.viewAll}</Link>
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>
            </div>
        </div>
      </section>

        {/* Login Prompt Section */}
        <section className="w-full py-16 md:py-24 bg-primary text-primary-foreground">
            <div className="container mx-auto max-w-4xl px-8 text-center">
                 <h2 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tighter">
                    {t.cta.heading}
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg text-primary-foreground/80">
                    {t.cta.body}
                </p>
                <Button asChild size="lg" variant="secondary" className="mt-8">
                    <Link href="/login">{t.cta.button}</Link>
                </Button>
            </div>
        </section>
    </div>
  );
}
