import { cn } from "@/lib/cn";
import { useC, resolveAsset, editable } from "@/content/ContentProvider";

type RobotProps = {
  className?: string;
  size?: number;
  float?: boolean;
  glow?: boolean;
};

export function RobotHead({ className, size = 140, float = true, glow = true }: RobotProps) {
  const c = useC();
  return (
    <div
      className={cn("relative grid place-items-center", float && "animate-float-y", className)}
      style={{ width: size, height: size }}
    >
      {glow && (
        <span
          className="absolute inset-0 -z-10 rounded-full blur-2xl"
          style={{
            background:
              "radial-gradient(circle at 50% 45%, rgb(var(--c-blue)/0.38), rgb(var(--c-blue)/0) 65%)",
          }}
        />
      )}
      <img
        src={resolveAsset(c("global.robot.image", "/assets/robot/head.png"))}
        {...editable("global.robot.image", "image")}
        alt="AIREA — your AI marketing assistant"
        draggable={false}
        className="h-full w-full object-contain drop-shadow-[0_18px_30px_rgba(16,24,40,0.18)]"
      />
    </div>
  );
}
