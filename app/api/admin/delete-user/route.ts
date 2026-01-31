import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if the requesting user is an admin
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify the current user is a super admin
    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('is_super_admin')
      .eq('id', currentUser.id)
      .single();

    if (!currentProfile?.is_super_admin) {
      return NextResponse.json(
        { error: 'Unauthorized - Super Admin access required' },
        { status: 403 }
      );
    }

    // Get the user's avatar URL before deletion
    const { data: userProfile, error: fetchError } = await supabase
      .from('user_profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching user profile:', fetchError);
    }

    // Delete avatar from storage if it exists
    if (userProfile?.avatar_url) {
      try {
        const urlParts = userProfile.avatar_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        if (fileName) {
          await supabase.storage.from('avatars').remove([fileName]);
        }
      } catch (storageError) {
        console.error('Error deleting avatar:', storageError);
        // Continue even if avatar deletion fails
      }
    }

    // Use RPC function to delete user (bypasses RLS)
    const { error: deleteError } = await supabase.rpc('delete_user_as_admin', {
      user_id_to_delete: userId
    });

    if (deleteError) {
      console.error('Error deleting user via RPC:', deleteError);
      return NextResponse.json(
        { error: `Failed to delete user: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete-user API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
