import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Web Chroma Key
        </h1>
        <p className="text-center text-lg mb-8 text-muted-foreground">
          웹브라우저에서 실시간으로 웹캠 배경을 교체하는 크로마키 기능
        </p>
        <div className="flex justify-center">
          <Link
            href="/chromakey"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            시작하기
          </Link>
        </div>
      </div>
    </main>
  );
}
