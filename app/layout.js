import './globals.css'
import { Providers } from './providers'

export const metadata = {
  title: 'CareerLens — AI Resume Analyzer & ATS Scorer',
  description: 'Upload your resume, paste a job description, get instant ATS score, missing keywords, red flags, and tailored improvements — powered by AI.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
