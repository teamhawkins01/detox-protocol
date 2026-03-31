'use client';

import { 
  User, LeafyGreen, Carrot, Citrus, Apple, Sprout, Bean, Cherry, Salad, Droplet, GlassWater 
} from 'lucide-react';
import Image from 'next/image';

const AVATAR_ICONS: Record<string, any> = {
  LeafyGreen, Carrot, Citrus, Apple, Sprout, Bean, Cherry, Salad, Droplet, GlassWater
};

interface ProfileImageProps {
  src?: string;
  className?: string;
  iconClassName?: string;
}

export default function ProfileImage({ src, className = "w-12 h-12", iconClassName = "w-6 h-6" }: ProfileImageProps) {
  if (!src) {
    return (
      <div className={`${className} flex items-center justify-center bg-detox-green/10 text-detox-green rounded-full border border-detox-green/20`}>
        <User className={iconClassName} />
      </div>
    );
  }

  const Icon = AVATAR_ICONS[src];
  if (Icon) {
    return (
      <div className={`${className} flex items-center justify-center bg-detox-green/10 text-detox-green rounded-full border border-detox-green/20`}>
        <Icon className={iconClassName} />
      </div>
    );
  }

  // Check if it's a URL (including blob: for previews)
  if (src.startsWith('http') || src.startsWith('/') || src.startsWith('data:') || src.startsWith('blob:')) {
    return (
      <div className={`${className} relative rounded-full overflow-hidden border border-detox-green/20 bg-black`}>
        <Image 
          src={src} 
          alt="Profile" 
          fill 
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Fallback to User icon if string doesn't match anything
  return (
    <div className={`${className} flex items-center justify-center bg-detox-green/10 text-detox-green rounded-full border border-detox-green/20`}>
      <User className={iconClassName} />
    </div>
  );
}
