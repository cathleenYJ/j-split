/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#F5F0E8',
        surface: '#FDFAF5',
        surface2: '#F0EBE0',
        accent: '#2D5A3D',
        accent2: '#C8A96E',
        text: '#1A1A1A',
        text2: '#5C5045',
        text3: '#9C8E7E',
      },
      fontFamily: {
        sans: ['var(--font-dm-sans)'],
        serif: ['var(--font-noto-serif)'],
      },
    },
  },
  plugins: [],
}
