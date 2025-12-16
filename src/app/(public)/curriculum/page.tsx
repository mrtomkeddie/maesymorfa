

'use client';

import { useLanguage } from './../LanguageProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, BookOpen, Leaf, Puzzle, Users } from "lucide-react";
import Link from 'next/link';
import { Suspense } from "react";

const content = {
  en: {
    title: "Curriculum at Maes Y Morfa",
    intro: "At Maes Y Morfa Primary, our curriculum is designed to nurture curiosity, inspire creativity, and equip children with the skills they need for the future. Explore what your child will learn at each stage.",
    stages: [
      {
        icon: Puzzle,
        title: "Progression Step 1 (Nursery & Reception)",
        summary: "Learning through play, building strong foundations in literacy and numeracy in a nurturing environment.",
        details: "View Details",
        href: "/curriculum/early-years"
      },
      {
        icon: BookOpen,
        title: "Progression Step 2 (Years 1, 2 & 3)",
        summary: "Developing core skills in reading, writing, and maths while exploring a broad and balanced range of subjects.",
        details: "View Details",
        href: "/curriculum/key-stage-1"
      },
      {
        icon: Users,
        title: "Progression Step 3 (Years 4, 5 & 6)",
        summary: "Fostering independent learning and deeper subject knowledge to prepare pupils for their transition to secondary school.",
        details: "View Details",
        href: "/curriculum/key-stage-2"
      },
      {
        icon: Leaf,
        title: "Beyond the Classroom",
        summary: "Enriching the curriculum through outdoor learning, educational trips, and a wide variety of after-school clubs.",
        details: "View Details",
        href: "/curriculum/beyond-the-classroom"
      }
    ],
    learnMoreTitle: "Learn More",
    learnMoreBody: "Have a question about our curriculum? We'd love to hear from you. Please contact the school office to speak to a member of staff.",
    contactUs: "Contact Us"
  },
  cy: {
    title: "Cwricwlwm ym Maes Y Morfa",
    intro: "Ym Maes Y Morfa, mae ein cwricwlwm wedi'i gynllunio i feithrin chwilfrydedd, ysbrydoli creadigrwydd, a rhoi'r sgiliau sydd eu hangen ar blant ar gyfer y dyfodol. Archwiliwch beth fydd eich plentyn yn ei ddysgu ar bob cam.",
    stages: [
      {
        icon: Puzzle,
        title: "Cam Cynnydd 1 (Meithrin a Derbyn)",
        summary: "Dysgu drwy chwarae, adeiladu sylfeini cryf mewn llythrennedd a rhifedd mewn amgylchedd meithringar.",
        details: "Gweld Manylion",
        href: "/curriculum/early-years"
      },
      {
        icon: BookOpen,
        title: "Cam Cynnydd 2 (Blynyddoedd 1, 2 a 3)",
        summary: "Datblygu sgiliau craidd mewn darllen, ysgrifennu, a mathemateg wrth archwilio ystod eang a chytbwys o bynciau.",
        details: "Gweld Manylion",
        href: "/curriculum/key-stage-1"
      },
      {
        icon: Users,
        title: "Cam Cynnydd 3 (Blynyddoedd 4, 5 a 6)",
        summary: "Meithrin dysgu annibynnol a gwybodaeth bwnc ddyfnach i baratoi disgyblion ar gyfer eu trosglwyddiad i'r ysgol uwchradd.",
        details: "Gweld Manylion",
        href: "/curriculum/key-stage-2"
      },
      {
        icon: Leaf,
        title: "Y Tu Hwnt i'r Ystafell Ddosbarth",
        summary: "Cyfoethogi'r cwricwlwm drwy ddysgu yn yr awyr agored, teithiau addysgol, ac amrywiaeth eang o glybiau ar ôl ysgol.",
        details: "Gweld Manylion",
        href: "/curriculum/beyond-the-classroom"
      }
    ],
    learnMoreTitle: "Dysgu Mwy",
    learnMoreBody: "Oes gennych chi gwestiwn am ein cwricwlwm? Byddem wrth ein bodd yn clywed gennych. Cysylltwch â swyddfa'r ysgol i siarad ag aelod o staff.",
    contactUs: "Cysylltu â Ni"
  }
};


export default function CurriculumPage() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <div className="bg-background">
      <section className="w-full py-16 md:py-24">
        <div className="container mx-auto max-w-4xl px-8 space-y-12">

          <div className="text-center">
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-foreground md:text-6xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-foreground/80">
              {t.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {t.stages.map((stage, index) => {
              const Icon = stage.icon;
              return (
                <Card key={index} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary shadow-inner">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="font-headline text-xl">{stage.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{stage.summary}</CardDescription>
                  </CardContent>
                  <div className="p-6 pt-0">
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={stage.href}>
                        {stage.details} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="text-center border-t pt-12">
            <h3 className="font-headline text-3xl font-bold">{t.learnMoreTitle}</h3>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">{t.learnMoreBody}</p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <Button asChild>
                <a href="/contact"><Mail className="mr-2 h-4 w-4" />{t.contactUs}</a>
              </Button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
