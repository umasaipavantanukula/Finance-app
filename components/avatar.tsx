import { createClient } from "@/lib/supabase/server"
import { CircleUser } from 'lucide-react'
import Image from 'next/image'

export default async function Avatar({ width = 32, height = 32 }) {
  try {
    const supabase = createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    // If no user (demo mode) or user has no avatar, show default icon
    if (userError || !user || !user.user_metadata?.avatar) {
      return <CircleUser className="w-6 h-6" />
    }

    const { data: imageData, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(user.user_metadata.avatar, 60 * 5)

    if (error || !imageData?.signedUrl) {
      return <CircleUser className="w-6 h-6" />
    }

    return <Image src={imageData.signedUrl} width={width} height={height} alt="User avatar" className="rounded-full" />
  } catch (error) {
    // Fallback for any errors (like in demo mode)
    console.log('Avatar component fallback to default icon:', error)
    return <CircleUser className="w-6 h-6" />
  }
}