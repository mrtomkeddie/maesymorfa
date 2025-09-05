
'use client';

import { Card } from "@/components/ui/card";
import { Camera, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/db';
import type { PhotoWithId } from '@/lib/types';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from "@/components/ui/button";
import { parentChildrenYearGroups } from '@/lib/mockData';
import { useLanguage } from "@/app/(public)/LanguageProvider";

const content = {
  en: {
    title: "Photo Gallery",
    description: "Recent photos from your children's classes and school events.",
    filterLabel: "Filter by class:",
    noPhotosTitle: "No Photos Yet",
    noPhotosDescription1: "There are no photos to display for your children's classes at the moment.",
    noPhotosDescription2: "Please check back soon!",
  },
  cy: {
    title: "Oriel Ffotograffau",
    description: "Lluniau diweddar o ddosbarthiadau eich plant a digwyddiadau ysgol.",
    filterLabel: "Hidlo yn ôl dosbarth:",
    noPhotosTitle: "Dim Lluniau Eto",
    noPhotosDescription1: "Nid oes unrhyw luniau i'w harddangos ar gyfer dosbarthiadau eich plant ar hyn o bryd.",
    noPhotosDescription2: "Gwiriwch yn ôl yn fuan!",
  }
};

export default function GalleryPage() {
  const { language } = useLanguage();
  const t = content[language];
  const [photos, setPhotos] = useState<PhotoWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  useEffect(() => {
    const fetchAndSetPhotos = async () => {
      setIsLoading(true);
      try {
        // Fetch all photos relevant to any of the parent's children
        const relevantPhotos = await db.getPhotosForYearGroups(parentChildrenYearGroups);
        setPhotos(relevantPhotos);
      } catch (error) {
        console.error("Failed to fetch photos:", error);
        // Optionally set an error state to show a message to the user
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndSetPhotos();
  }, []);

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'All') {
      return photos;
    }
    return photos.filter(photo => photo.yearGroups.includes(activeFilter));
  }, [photos, activeFilter]);
  
  const allParentYearGroups = useMemo(() => {
      const uniqueYears = new Set(parentChildrenYearGroups);
      return Array.from(uniqueYears);
  }, []);
  
  const filterOptions = ['All', ...allParentYearGroups];

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{t.title}</h1>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
      </div>
      
      {allParentYearGroups.length > 1 && (
         <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 flex-wrap">
          <p className="text-sm font-medium mr-2">{t.filterLabel}</p>
          {filterOptions.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </Button>
          ))}
        </div>
      )}


      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : photos.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">{t.noPhotosTitle}</h2>
            <p className="mt-2 text-muted-foreground">
                {t.noPhotosDescription1}
                <br />
                {t.noPhotosDescription2}
            </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <Card key={photo.id} className="overflow-hidden group relative transition-all hover:shadow-lg">
                <Image
                  src={photo.imageUrl}
                  alt={photo.caption}
                  width={400}
                  height={400}
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-sm font-semibold truncate group-hover:whitespace-normal group-hover:line-clamp-none">{photo.caption}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {photo.yearGroups.map(yg => <Badge key={yg} variant="secondary" className="text-xs">{yg}</Badge>)}
                  </div>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
