import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">HelperSync</h1>
          <p className="text-gray-500 mt-2">
            Household helper management, simplified
          </p>
        </div>
        <SignUp
          appearance={{
            elements: {
              formButtonPrimary:
                "bg-primary hover:bg-primary-700 text-white rounded-xl",
              card: "rounded-2xl shadow-card border-0",
            },
          }}
        />
      </div>
    </div>
  );
}
