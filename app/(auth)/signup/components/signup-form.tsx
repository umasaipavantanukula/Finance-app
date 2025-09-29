'use client'
import Input from "@/components/input";
import SubmitButton from "@/components/submit-button";
import { signUp } from "@/lib/actions";
import { useFormState } from "react-dom";
import Link from "next/link";

const initialState = {
  message: '',
  error: false
}

export default function SignUpForm() {
  const [state, formAction] = useFormState(signUp, initialState);
  
  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <Input 
          type="text" 
          placeholder="Full Name (optional)"
          name="fullName" 
        />
        <Input 
          type="email" 
          placeholder="name@example.com"
          name="email" 
          required 
        />
        <Input 
          type="password" 
          placeholder="Password (min. 6 characters)"
          name="password" 
          required 
        />
        <SubmitButton type="submit" size="sm" className="w-full">
          Create Account
        </SubmitButton>
        <p className={`${state?.error ? 'text-red-500' : 'text-green-500'} text-sm text-center`}>
          {state?.message}
        </p>
      </form>
      
      <div className="text-center">
        <p className="text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}