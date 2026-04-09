import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Users, Grid3X3, Crown, Lock, MessageCircle, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { creatorProfile } from "../lib/mockData";

export default function CreatorProfile() {
  const creator = creatorProfile;

  return (
    <div className="min-h-screen">
      {/* Cover */}
      <div className="relative h-64 sm:h-80 overflow-hidden">
        <img
          src={creator.cover}
          alt="Cover"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      </div>

      {/* Profile header */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-6"
        >
          <div className="relative">
            <img
              src={creator.avatar}
              alt={creator.name}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl object-cover border-4 border-background"
            />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Crown className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
              <div>
                <h1 className="font-heading text-2xl sm:text-3xl font-bold">{creator.name}</h1>
                <p className="text-muted-foreground text-sm">{creator.handle}</p>
              </div>
              <div className="flex items-center gap-1 sm:ml-auto">
                <Star className="w-4 h-4 text-chart-4 fill-chart-4" />
                <span className="text-sm font-semibold">{creator.rating}</span>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg mb-4">{creator.bio}</p>

            <div className="flex items-center gap-6 mb-5">
              <div className="text-center">
                <p className="font-heading font-bold text-lg">{creator.fans}</p>
                <p className="text-xs text-muted-foreground">Fan</p>
              </div>
              <div className="text-center">
                <p className="font-heading font-bold text-lg">{creator.posts}</p>
                <p className="text-xs text-muted-foreground">Contenuti</p>
              </div>
              <div className="px-4 py-2 rounded-xl bg-primary/10 border border-primary/20">
                <p className="font-heading font-bold text-primary">{creator.subscriptionPrice}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link to="/checkout">
                <Button className="bg-primary hover:bg-primary/90 glow-primary font-semibold">
                  <Crown className="w-4 h-4 mr-2" />
                  Abbonati
                </Button>
              </Link>
              <Button variant="outline" className="border-border/50">
                <MessageCircle className="w-4 h-4 mr-2" />
                Messaggio
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="mt-10">
          <TabsList className="bg-secondary/50 border border-border/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Grid3X3 className="w-4 h-4 mr-2" />
              Contenuti
            </TabsTrigger>
            <TabsTrigger value="premium" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Crown className="w-4 h-4 mr-2" />
              Premium
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-4 h-4 mr-2" />
              Community
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <ContentGrid contents={creator.contents} />
          </TabsContent>
          
          <TabsContent value="premium" className="mt-6">
            <ContentGrid contents={creator.contents.filter(c => c.type === "premium")} />
          </TabsContent>

          <TabsContent value="community" className="mt-6">
            <div className="glass rounded-2xl border border-border/30 p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-heading font-bold text-lg mb-2">Community riservata</h3>
              <p className="text-sm text-muted-foreground mb-4">Abbonati per accedere alla community esclusiva di {creator.name}</p>
              <Link to="/checkout">
                <Button className="bg-primary hover:bg-primary/90 glow-primary">
                  Abbonati per accedere
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-20" />
    </div>
  );
}

function ContentGrid({ contents }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      {contents.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
        >
          <Link to="/content" className="group block">
            <div className="relative aspect-square rounded-xl overflow-hidden border border-border/30">
              <img
                src={item.image}
                alt={item.title}
                className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
                  item.type === "premium" ? "blur-md" : ""
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {item.type === "premium" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center glow-primary">
                    <Lock className="w-5 h-5 text-primary" />
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2">
                <Badge 
                  className={`text-[10px] ${
                    item.type === "premium" 
                      ? "bg-primary/20 text-primary border-primary/30" 
                      : "bg-chart-3/20 text-chart-3 border-chart-3/30"
                  }`}
                >
                  {item.type === "premium" ? "Premium" : "Free"}
                </Badge>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs font-medium line-clamp-2">{item.title}</p>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}