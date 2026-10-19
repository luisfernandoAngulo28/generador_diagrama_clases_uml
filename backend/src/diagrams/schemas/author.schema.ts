import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Who did something to a diagram-level document (diagram owner, last editor, chat sender, log actor). */
@Schema({ _id: false })
export class Actor {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  userName: string;

  @Prop({ type: String, enum: ['USER', 'AI'], default: 'USER' })
  type: 'USER' | 'AI';
}

export const ActorSchema = SchemaFactory.createForClass(Actor);
