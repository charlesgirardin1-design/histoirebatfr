// 📖 Docs: obsidian/frontend/components/animation-springs.md
import { Tags } from "@/types/springs";
import { animated, ElementType } from "@react-spring/web";
import {
  createElement,
  CSSProperties,
  forwardRef,
  ReactNode,
  useImperativeHandle,
  useRef,
} from "react";

export interface VarTextTagProps {
  tag?: Tags;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}
export const AnimatedVarTextTag = forwardRef<HTMLElement, VarTextTagProps>(
  ({ tag = "span", children, className, style, ...props }, outerRef) => {
    const ref = useRef<HTMLElement | null>(null);
    useImperativeHandle(outerRef, () => ref.current as HTMLElement);
    const Tag = animated[tag] as ElementType;

    // createElement, not JSX: a polymorphic `Tag: ElementType` checked as a JSX
    // tag is matched against every member of JSX.IntrinsicElements, and a very
    // varied IntrinsicElements map (e.g. after @react-three/fiber's global
    // ThreeElements augmentation) can collapse the merged prop type to `never`.
    // createElement's ElementType overload isn't subject to that check.
    return createElement(Tag, { ref, className, style, ...props }, children);
  },
);
AnimatedVarTextTag.displayName = "AnimatedVarTextTag";
