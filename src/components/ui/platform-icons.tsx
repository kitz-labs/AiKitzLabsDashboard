import type { SVGProps } from 'react';
import { Facebook, Github, Instagram, Linkedin } from 'lucide-react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export function WhatsappIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.11 4.89A9.93 9.93 0 0 0 12.05 2C6.56 2 2.08 6.48 2.08 11.97c0 1.76.46 3.48 1.33 5L2 22l5.2-1.36a9.92 9.92 0 0 0 4.75 1.21h.01c5.49 0 9.97-4.48 9.97-9.97a9.88 9.88 0 0 0-2.82-6.99Zm-7.06 15.27h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.08.81.82-3-.2-.31a8.28 8.28 0 0 1-1.26-4.37c0-4.57 3.72-8.29 8.3-8.29 2.21 0 4.28.86 5.84 2.43a8.2 8.2 0 0 1 2.42 5.85c0 4.57-3.72 8.29-8.3 8.29Zm4.55-6.2c-.25-.13-1.48-.73-1.71-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.04-.38-1.98-1.2-.73-.65-1.22-1.44-1.36-1.69-.14-.25-.01-.39.11-.52.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.41-.56-.42h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.23.9 2.43 1.02 2.6.13.17 1.77 2.7 4.28 3.79.6.26 1.07.42 1.44.54.61.2 1.16.17 1.6.1.49-.07 1.48-.6 1.69-1.19.21-.58.21-1.08.14-1.18-.06-.11-.23-.17-.48-.29Z" />
    </svg>
  );
}

export function TelegramIcon({ size = 18, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" {...props}>
      <path d="M21.94 4.66a1.5 1.5 0 0 0-1.72-.24L3.58 12.38a1.5 1.5 0 0 0 .16 2.76l4.19 1.57 1.61 4.9a1.5 1.5 0 0 0 2.56.58l2.52-2.72 4.13 3.04a1.5 1.5 0 0 0 2.37-.9l2.81-15.15a1.5 1.5 0 0 0-.99-1.8ZM9.32 15.94l-.9 3.1-1.09-3.31 9.85-6.17-7.86 6.38Zm1.53 2.15.51-1.77 1.44 1.06-1.95.71Zm8.02 1.48-4.97-3.65 6.6-5.36-1.63 9.01Z" />
    </svg>
  );
}

export const InstagramIcon = Instagram;
export const FacebookIcon = Facebook;
export const LinkedinIcon = Linkedin;
export const GithubIcon = Github;