interface Reaction {
  postID: string;
  userID: string;
  reactionType: 'like' | 'dislike' | 'heart';
}