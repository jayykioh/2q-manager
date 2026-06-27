import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '2Q Manager',
    short_name: '2Q',
    description: 'Internal POS and Management System',
    start_url: '/login',
    display: 'standalone',
    background_color: '#FAFAFA',
    theme_color: '#0A0A0A',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  }
}
