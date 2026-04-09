import { Lock, Heart, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function CreatorCard({ content, index = 0 }) {
  const isLocked = content.type === "premium";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="group"
    >
      <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-card/50 hover:border-primary/30 transition-all duration-300">
        {/* Image */}
        <Link to="/content">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img
              src={content.image}
              alt={content.title}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                isLocked ? "blur-lg" : ""
              }`}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />

            {/* Lock overlay */}
            {isLocked && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                <div className="glass rounded-2xl p-6 text-center border border-border/50 max-w-[200px]">
                  <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
                  <p className="text-sm font-semibold mb-1">Contenuto Premium</p>
                  <p className="text-xs text-muted-foreground mb-3">Sblocca per vedere</p>
                  <Button size="sm" className="bg-primary hover:bg-primary/90 glow-primary text-xs w-full">
                    Sblocca
                  </Button>
                </div>
              </div>
            )}

            {/* Badge */}
            <div className="absolute top-3 left-3">
              <Badge 
                className={`${
                  isLocked 
                    ? "bg-primary/20 text-primary border-primary/30" 
                    : "bg-chart-3/20 text-chart-3 border-chart-3/30"
                } text-xs font-medium`}
              >
                {isLocked ? "Premium" : "Free"}
              </Badge>
            </div>
          </div>
        </Link>

        {/* Content info */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <img
              src={content.creatorAvatar}
              alt={content.creatorName}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex-1 min-w-0">
              <Link to="/creator" className="text-sm font-semibold hover:text-primary transition-colors truncate block">
                {content.creatorName}
              </Link>
              <p className="text-xs text-muted-foreground">{content.timeAgo}</p>
            </div>
          </div>
          
          <p className="text-sm text-foreground/90 line-clamp-2 mb-3">{content.title}</p>
          
          <div className="flex items-center gap-4 text-muted-foreground">
            <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors group/btn">
              <Heart className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              {content.likes}
            </button>
            <button className="flex items-center gap-1.5 text-xs hover:text-accent transition-colors">
              <MessageCircle className="w-4 h-4" />
              {content.comments}
            </button>
            <span className="flex items-center gap-1.5 text-xs ml-auto">
              <Eye className="w-4 h-4" />
              {content.views}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}